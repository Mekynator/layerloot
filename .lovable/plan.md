

# Connect All Admin Editors to Draft/Preview/Publish Architecture

## Current State
The draft/publish system is already working for:
- **Visual Editor** (blocks) — via `VisualEditorContext.tsx` + `use-draft-publish.ts`
- **Backgrounds** — via `AdminBackgrounds.tsx` using `saveDraftSetting`/`publishDraftSetting`

Still writing **directly to live `site_settings.value`** (bypassing draft):
- **AdminSettings.tsx** — `upsertSetting()` writes directly to `value` for: contact, store, promo popup, footer, branding, policies, account page config, dashboard shortcuts, sidebar config
- **NavLinkEditor.tsx** — saves header/footer nav links directly via `.upsert()` to `value`
- **PageBackgroundEditor.tsx** (dialog version) — still writes directly to `value`
- **RewardsStoreEditor.tsx** — writes directly to `vouchers` table (not site_settings, lower priority)

## Architecture

### Strategy: Unified `useDraftSettings` hook + per-editor integration

Create a reusable React hook `useDraftSettings(key)` that wraps the existing `loadDraftSetting`/`saveDraftSetting`/`publishDraftSetting`/`discardDraftSetting` functions and exposes a clean API for any settings editor. Then connect each admin editor to use it.

### Scope classification

**Storefront-affecting settings (must use draft/publish):**
- `contact` — contact info shown in footer
- `store` — store name, currency
- `branding` — logo config
- `footer_settings` — footer layout/labels
- `promotion_popup` — promo popup config
- `policy_*` — legal pages content
- `account_page_config` — account page layout
- `header_nav_links` / `footer_nav_links` — navigation
- `page_background_global` — already connected

**Admin-only settings (keep saving directly, not public-facing):**
- `admin_dashboard_shortcuts` — admin internal
- `admin_sidebar_config` — admin internal

## Implementation Plan

### 1. Create `useDraftSettings` hook
New file: `src/hooks/use-draft-settings.ts`

A reusable hook that takes a settings key and returns:
```typescript
{
  value: T,           // draft if exists, else live
  liveValue: T,       // always live
  hasDraft: boolean,
  draftStatus: DraftStatus,
  loading: boolean,
  setValue: (v: T) => void,       // update local state
  saveDraft: () => Promise<void>, // persist to draft_value column
  publish: () => Promise<void>,   // promote draft_value → value
  discard: () => Promise<void>,   // clear draft_value, reload live
}
```

This eliminates repeated draft logic in every editor.

### 2. Create `DraftActionBar` component
New file: `src/components/admin/DraftActionBar.tsx`

A shared UI bar with Save Draft / Publish / Discard Draft / status badge. Used by all settings editors for visual consistency.

### 3. Refactor AdminSettings.tsx
- Replace `upsertSetting()` with draft-based saves for storefront settings
- Use multiple `useDraftSettings` instances for each config key
- Keep `admin_dashboard_shortcuts` and `admin_sidebar_config` saving directly (admin-internal)
- Add `DraftActionBar` with Save Draft / Publish / Discard buttons
- Split save into "Save Draft" (all storefront settings to draft_value) and "Publish" (promote all to value)

### 4. Refactor NavLinkEditor.tsx
- Replace direct `.upsert()` with `saveDraftSetting` / `publishDraftSetting`
- Add draft status badge and Publish button
- Load from draft_value when available

### 5. Update PageBackgroundEditor.tsx (dialog)
- Replace direct `.upsert()` to `value` with `saveDraftSetting`
- Or deprecate the dialog in favor of the AdminBackgrounds page (which is already connected)

### 6. Preview frame consistency
- `EditorPreviewFrame` already loads via iframe with `?editorPreview=1`
- The iframe renders blocks from `site_blocks` where the public query reads `content` column
- For settings-based preview, the iframe currently reads live `value` — update `GlobalSectionRenderer` and `PageBackgroundSlideshow` to check for `draft_value` when `editorPreview=1` param is present
- This ensures preview reflects draft settings too

### 7. Public query safety
- Public pages already read only `content` (blocks) and `value` (settings) — no changes needed
- The `draft_value` / `draft_content` columns are never read by public components
- Verify `GlobalSectionRenderer.tsx`, `use-page-blocks.ts`, `PageBackgroundSlideshow.tsx`, `use-storefront.ts` all read `value`/`content` only — confirmed, no changes needed

## Files to create
| File | Purpose |
|---|---|
| `src/hooks/use-draft-settings.ts` | Reusable hook wrapping draft setting operations |
| `src/components/admin/DraftActionBar.tsx` | Shared Save Draft / Publish / Discard UI bar |

## Files to modify
| File | Change |
|---|---|
| `src/pages/admin/AdminSettings.tsx` | Replace `upsertSetting` with draft flow for storefront settings, add DraftActionBar |
| `src/components/admin/NavLinkEditor.tsx` | Use draft save/publish instead of direct upsert |
| `src/components/admin/PageBackgroundEditor.tsx` | Use draft save instead of direct upsert |

## No database changes needed
All draft columns already exist on `site_settings` from the previous migration.

