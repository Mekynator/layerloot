

# Database & Data Layer: Proper Draft/Published Architecture

## Current State
- Drafts stored as JSON blobs in `site_settings` using key conventions (`draft_blocks_{page}`, `draft_setting_{key}`)
- No audit trail (who edited, who published, when)
- No revision history — publishing overwrites live content permanently
- No proper DB-level separation between draft and published states
- Works functionally but not scalable or auditable

## Architecture

### Strategy: Column-level draft storage + revision history table

Add `draft_content`/`draft_value` columns directly on `site_blocks` and `site_settings` instead of storing drafts as separate key-value entries. This keeps queries simple, avoids key-naming conventions, and enables proper indexing. Add a `content_revisions` table for historical snapshots.

### Migration 1: Extend `site_blocks`

```sql
ALTER TABLE public.site_blocks
  ADD COLUMN IF NOT EXISTS draft_content jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
```

- `content` remains the published/live column (public reads this — no change)
- `draft_content` holds pending edits (NULL = no draft)
- `has_draft` for fast filtering
- `published_at/by` and `updated_by` for audit

### Migration 2: Extend `site_settings`

```sql
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS draft_value jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
```

Same pattern — `value` is published, `draft_value` is pending.

### Migration 3: Create `content_revisions` table

```sql
CREATE TABLE public.content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,        -- 'site_block', 'site_setting'
  content_id text NOT NULL,          -- block UUID or setting key
  page text,                         -- page slug for blocks
  revision_data jsonb NOT NULL,      -- snapshot of content/value at publish time
  revision_number integer NOT NULL DEFAULT 1,
  action text NOT NULL DEFAULT 'publish', -- 'publish', 'revert', 'create'
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_revision UNIQUE (content_type, content_id, revision_number)
);

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage revisions"
  ON public.content_revisions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_revisions_lookup
  ON public.content_revisions (content_type, content_id, revision_number DESC);
```

### Migration 4: Clean up old draft keys

Migrate existing `draft_blocks_*` and `draft_setting_*` entries from `site_settings` into the new columns, then delete those rows.

```sql
-- This will be handled in the code layer during the transition
-- Delete stale draft keys after migration
DELETE FROM public.site_settings WHERE key LIKE 'draft_blocks_%' OR key LIKE 'draft_setting_%';
```

## Code Changes

### 1. Rewrite `src/hooks/use-draft-publish.ts`
Replace key-based draft storage with column-based operations:

- **`saveDraftBlocks(page, blocks, userId)`** → For each block: update `draft_content` + set `has_draft = true` + `updated_by`. For new blocks: insert with `draft_content` set and `content` as empty, mark `has_draft = true`.
- **`loadDraftBlocks(page)`** → Query `site_blocks` where `page = X` and use `COALESCE(draft_content, content)` for admin view. Return `has_draft` status.
- **`publishDraftBlocks(page, userId)`** → Copy `draft_content` → `content`, clear `draft_content`, set `has_draft = false`, set `published_at = now()`, `published_by = userId`. Insert revision into `content_revisions`.
- **`discardDraftBlocks(page)`** → Set `draft_content = NULL`, `has_draft = false` for all blocks on page. Delete any blocks that only existed as drafts (where `content` is empty/default).
- Same pattern for `saveDraftSetting`, `publishDraftSetting`, `discardDraftSetting`.
- **`revertToRevision(contentType, contentId, revisionNumber)`** → Load revision data and apply as new published content.
- **`usePageDraftStatus(page)`** → Query `SELECT EXISTS(... has_draft = true ...)` instead of checking for key existence.

### 2. Update `src/contexts/VisualEditorContext.tsx`
- `fetchBlocks`: Load blocks with `draft_content` for admin view using `COALESCE(draft_content, content)` 
- `save`: Write to `draft_content` column on each block instead of serializing to a settings key
- `publish`: Call updated `publishDraftBlocks` which writes revisions
- `discardDraft`: Call updated `discardDraftBlocks`
- Pass `user.id` for audit fields

### 3. Update `src/pages/admin/AdminBackgrounds.tsx`
- Save: Write to `draft_value` column on the settings row instead of a separate key
- Publish: Copy `draft_value` → `value`, write revision
- Discard: Clear `draft_value`

### 4. Public queries remain unchanged
- `src/hooks/use-page-blocks.ts` reads `content` column — still correct
- `src/components/layout/PageBackgroundSlideshow.tsx` reads `value` column — still correct  
- `src/components/layout/GlobalSectionRenderer.tsx` reads published blocks — still correct
- No public-facing code changes needed

## Files to modify
| File | Change |
|---|---|
| `src/hooks/use-draft-publish.ts` | Full rewrite: column-based draft ops + revision logging |
| `src/contexts/VisualEditorContext.tsx` | Update save/publish/discard to use new column-based API |
| `src/pages/admin/AdminBackgrounds.tsx` | Update save/publish/discard for settings draft columns |

## Files unchanged (public layer)
- `src/hooks/use-page-blocks.ts` — reads `content`, unaffected
- `src/components/layout/PageBackgroundSlideshow.tsx` — reads `value`, unaffected
- `src/components/layout/GlobalSectionRenderer.tsx` — reads published blocks, unaffected

## Database changes summary
- **Alter** `site_blocks`: +5 columns (draft_content, has_draft, published_at, published_by, updated_by)
- **Alter** `site_settings`: +5 columns (draft_value, has_draft, published_at, published_by, updated_by)
- **Create** `content_revisions` table with admin-only RLS
- **Delete** legacy `draft_blocks_*` / `draft_setting_*` rows from site_settings

