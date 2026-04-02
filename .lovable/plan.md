

# Media Manager, Asset Versioning & Reusable Content Library

## Summary
Add a centralized media management system, a reusable content library, and integrate both into existing editors via a media picker dialog. This replaces scattered upload-only inputs with a unified asset workflow.

## Database Changes

### Migration: Create `media_assets` and `reusable_blocks` tables

**`media_assets`** — central registry for all uploaded media:
- `id` uuid PK
- `file_name` text (sanitized storage name)
- `original_name` text
- `storage_bucket` text (default `editor-images`)
- `storage_path` text (path within bucket)
- `public_url` text
- `alt_text` text
- `title` text
- `description` text
- `tags` text[]
- `media_type` text (`image`, `video`, `document`)
- `mime_type` text
- `width` int, `height` int (nullable)
- `file_size_bytes` bigint
- `folder` text (default `/`)
- `uploaded_by` uuid
- `is_archived` boolean (default false)
- `usage_count` int (default 0, updated opportunistically)
- `created_at`, `updated_at` timestamptz
- RLS: admins full access, no public write

**`media_asset_versions`** — version history when an asset is replaced:
- `id` uuid PK
- `asset_id` uuid FK → media_assets
- `version_number` int
- `storage_path` text
- `public_url` text
- `file_size_bytes` bigint
- `replaced_by` uuid (user)
- `created_at` timestamptz
- RLS: admin-only

**`reusable_blocks`** — saved reusable content sections:
- `id` uuid PK
- `name` text
- `description` text
- `block_type` text
- `content` jsonb (the block content snapshot)
- `thumbnail_url` text
- `tags` text[]
- `created_by` uuid
- `updated_by` uuid
- `is_archived` boolean (default false)
- `created_at`, `updated_at` timestamptz
- RLS: admin-only

No changes to existing tables. The `editor-images` storage bucket continues to be the physical store.

## New Files

### 1. `src/hooks/use-media-library.ts`
React Query-based hook for media operations:
- `useMediaAssets(filters)` — paginated query with search, folder, type filters
- `uploadMediaAsset(file, metadata)` — uploads to `editor-images` bucket, inserts `media_assets` row, returns asset
- `replaceMediaAsset(assetId, newFile)` — archives current version to `media_asset_versions`, uploads replacement
- `archiveMediaAsset(assetId)` — soft-delete (sets `is_archived = true`)
- `restoreAssetVersion(versionId)` — restores previous version as current
- `updateAssetMetadata(assetId, patch)` — update alt_text, title, tags, folder

### 2. `src/components/admin/media/MediaLibraryPage.tsx`
Full admin page for browsing/managing media:
- Grid/list toggle with thumbnail previews
- Search bar, folder filter sidebar, type filter chips
- Upload dropzone (multi-file)
- Asset detail panel (metadata editing, version history, usage info)
- Archive/restore actions with usage warnings
- Pagination

### 3. `src/components/admin/media/MediaPickerDialog.tsx`
Modal dialog for selecting/uploading media from within editors:
- Opens as a dialog over the current editor
- Browse existing assets or upload new
- Search + filter
- Click to select → returns `public_url` to the caller via `onSelect(url)` callback
- "Upload new" tab for quick inline upload

### 4. `src/components/admin/media/AssetDetailPanel.tsx`
Side panel or expandable card showing:
- Full preview
- Metadata editing form (alt text, title, tags, folder)
- Version history list with restore buttons
- Usage references (basic: which pages/blocks reference this URL)

### 5. `src/pages/admin/AdminMedia.tsx`
Route page wrapper rendering `MediaLibraryPage` inside `AdminLayout`.

### 6. `src/components/admin/reusable/ReusableBlocksLibrary.tsx`
Admin page for managing reusable content blocks:
- Grid of saved reusable blocks with thumbnail + name
- Create from existing block ("Save as reusable")
- Edit reusable block content
- Archive/restore
- Tags + search

### 7. `src/components/admin/reusable/InsertReusableDialog.tsx`
Dialog for inserting a reusable block into a page:
- Browse library
- Choice: "Insert as linked" vs "Insert as copy"
- Linked: stores `reusable_block_id` reference in block content; updates propagate on publish
- Copy: snapshots content into a new independent block

### 8. `src/pages/admin/AdminReusableBlocks.tsx`
Route page wrapper for the reusable blocks library.

## Modified Files

### `src/components/admin/editor/controls/ImageUploadField.tsx`
- Add "Browse Library" button that opens `MediaPickerDialog`
- On upload, also create a `media_assets` row (dual-write: storage + DB record)
- Keep existing drag-drop and URL input as fallbacks

### `src/components/admin/AdminLayout.tsx`
- Add "Media Library" sidebar item under Core group (icon: `ImageIcon`, permission: `media.manage`)
- Add "Reusable Blocks" sidebar item under Core group (icon: `Box`, permission: `content.edit`)

### `src/App.tsx`
- Add routes: `/admin/media` → `AdminMedia`, `/admin/reusable-blocks` → `AdminReusableBlocks`
- Both wrapped in `AdminRoute` with appropriate permissions

### `src/contexts/VisualEditorContext.tsx`
- Add `saveAsReusable(blockId)` action that saves selected block to `reusable_blocks`
- Add `insertReusableBlock(reusableId, mode: 'linked' | 'copy', atIndex)` action

### `src/components/admin/editor/EditorToolbar.tsx` or `LayersPanel.tsx`
- Add "Save as Reusable" context action on blocks
- Add "Insert from Library" button that opens `InsertReusableDialog`

### Database migration for permissions seed
- Add `media.manage` permission for `super_admin`, `admin`, `editor` roles

## Architecture Notes

### Media picker flow
```text
Editor (ImageUploadField / block settings)
  → "Browse Library" button
  → MediaPickerDialog opens
  → User browses/uploads/selects
  → onSelect(publicUrl) called
  → Editor field updated with URL
  → Draft saved normally
```

### Linked reusable blocks
- Block content stores `{ _reusableId: "uuid", ...snapshotContent }`
- On publish, if `_reusableId` exists, content is refreshed from the reusable block's latest `content`
- On "detach", `_reusableId` is removed and content becomes independent

### Usage tracking
- Opportunistic: when MediaPickerDialog selects an asset, increment `usage_count`
- Deep scan not required initially; a background utility can be added later

### Draft/publish compatibility
- Media assets themselves are immediately available (no draft state on raw files)
- Using a different asset in a block/setting remains a draft change until published
- Reusable block edits follow the same draft/publish pattern as regular blocks

## Permission mapping
| Action | Permission |
|---|---|
| View/browse media | `media.manage` |
| Upload/edit/archive media | `media.manage` |
| Manage reusable blocks | `content.edit` |
| Insert reusable blocks | `content.edit` |

## Implementation order
1. Database migration (tables + permissions seed)
2. `use-media-library.ts` hook
3. `MediaPickerDialog` + `MediaLibraryPage` + route
4. Integrate picker into `ImageUploadField`
5. `ReusableBlocksLibrary` + `InsertReusableDialog` + route
6. Integrate reusable blocks into Visual Editor context
7. Sidebar + routing updates

