

# Revision History, Rollback & Scheduled Publishing

## Current State
- `content_revisions` table already exists with `content_type`, `content_id`, `page`, `revision_data`, `revision_number`, `action`, `created_by`, `created_at`
- `revertToRevision()` function exists in `use-draft-publish.ts` — reverts directly to published (no restore-as-draft option)
- No scheduled publishing support
- No revision history UI
- No `scheduled_publish_at` field anywhere

## Database Changes

### Migration 1: Extend `content_revisions` + add scheduling to blocks/settings

```sql
-- Add metadata to content_revisions for richer history
ALTER TABLE public.content_revisions
  ADD COLUMN IF NOT EXISTS change_summary text,
  ADD COLUMN IF NOT EXISTS restored_from_revision_id uuid;

-- Add scheduled publishing to site_blocks
ALTER TABLE public.site_blocks
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- Add scheduled publishing to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- Index for the scheduled publish job
CREATE INDEX IF NOT EXISTS idx_blocks_scheduled
  ON public.site_blocks (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;

CREATE INDEX IF NOT EXISTS idx_settings_scheduled
  ON public.site_settings (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;
```

### Edge Function: `process-scheduled-publish`
A cron-triggered edge function that:
1. Queries `site_blocks` and `site_settings` where `scheduled_publish_at <= now()` and `has_draft = true`
2. For each match: promotes `draft_content` → `content` (or `draft_value` → `value`), logs revision, clears draft state
3. Scheduled via `pg_cron` to run every minute

## Code Changes

### 1. Update `use-draft-publish.ts`
- Add `saveDraftBlocksScheduled(page, blocks, scheduledAt, userId)` — same as `saveDraftBlocks` but also sets `scheduled_publish_at`
- Add `saveDraftSettingScheduled(key, value, scheduledAt, userId)` — same pattern for settings
- Add `cancelSchedule(contentType, contentId)` — clears `scheduled_publish_at`
- Update `revertToRevision` to support "restore as draft" mode (creates draft_content from revision instead of publishing directly)
- Add `loadRevisions(contentType, contentId)` — fetches revision history for a content item
- Add `loadPageRevisions(page)` — fetches all revisions for blocks on a page

### 2. New: `src/components/admin/RevisionHistoryPanel.tsx`
A slide-out panel or dialog showing revision history for the current page/setting:
- Table of revisions: revision number, action (publish/revert/delete), created_by, created_at, change_summary
- Badge showing which is current published
- "Restore as Draft" button on each revision row
- "Restore & Publish" button (super_admin/admin only)
- Filterable by action type

### 3. New: `src/components/admin/SchedulePublishDialog.tsx`
A dialog for scheduling:
- Date/time picker for `scheduled_publish_at`
- Shows current timezone
- Actions: "Schedule", "Cancel Schedule", "Publish Now Instead"
- Status badge: "Scheduled for [date]"

### 4. Update `EditorToolbar.tsx`
- Add "History" button → opens `RevisionHistoryPanel`
- Add dropdown to Publish button: "Publish Now" / "Schedule Publish"
- Show "Scheduled for [date]" badge when content is scheduled
- Extend `DraftStatus` type to include `"scheduled"`

### 5. Update `VisualEditorContext.tsx`
- Add `schedulePublish(date)` action
- Add `cancelSchedule()` action
- Track `scheduledAt` state from block data
- Add `revisions` state for history panel

### 6. Update `DraftActionBar.tsx`
- Add optional `scheduledAt` prop
- Add "Schedule" button option
- Show "Scheduled for [date]" status badge
- Connect to `RevisionHistoryPanel` via optional `onViewHistory` prop

### 7. Update `AdminBackgrounds.tsx`
- Add "History" button to view revision history for background settings
- Add schedule option to publish controls

### 8. Update `use-draft-settings.ts`
- Add `schedulePublish(date, userId)` method
- Add `cancelSchedule()` method
- Track `scheduledAt` from the loaded setting row

### 9. Edge function: `supabase/functions/process-scheduled-publish/index.ts`
- Uses service_role key to query and promote scheduled content
- Logs activity for each auto-publish
- Inserts revision records
- Set up cron job via `pg_cron` + `pg_net`

## Files Summary

| Action | File |
|---|---|
| Create | `src/components/admin/RevisionHistoryPanel.tsx` |
| Create | `src/components/admin/SchedulePublishDialog.tsx` |
| Create | `supabase/functions/process-scheduled-publish/index.ts` |
| Modify | `src/hooks/use-draft-publish.ts` (add schedule helpers, restore-as-draft, load revisions) |
| Modify | `src/hooks/use-draft-settings.ts` (add schedule support) |
| Modify | `src/contexts/VisualEditorContext.tsx` (add schedule/history state) |
| Modify | `src/components/admin/editor/EditorToolbar.tsx` (add History + Schedule buttons) |
| Modify | `src/components/admin/DraftActionBar.tsx` (add schedule/history props) |
| Modify | `src/pages/admin/AdminBackgrounds.tsx` (add history + schedule UI) |

## Database changes summary
- **Alter** `content_revisions`: +`change_summary`, +`restored_from_revision_id`
- **Alter** `site_blocks`: +`scheduled_publish_at`
- **Alter** `site_settings`: +`scheduled_publish_at`
- **Create** edge function `process-scheduled-publish` + cron job

