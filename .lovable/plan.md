

## Complete Page Editor — Full Website Builder

### Current State Assessment

The project has **two** page editors:
1. **VisualEditor** (`/admin/editor`) — Modern, uses `VisualEditorContext`, has live preview canvas, undo/redo, draft/publish, unified layout ordering, inline editing, element-level selection
2. **PageEditor** (`/admin/pages`) — Older, 1233 lines, uses iframe preview, separate block management

The VisualEditor is the more complete system. The plan focuses on enhancing it.

**Already working:**
- Header/Footer auto-create as global pages (`global_header`, `global_footer`)
- Page selector shows Pages + Global Sections groups
- Draft/publish/schedule workflow
- Desktop/tablet/mobile viewport toggle
- Undo/redo with keyboard shortcuts
- Drag-and-drop reorder with unified layout
- Block add/delete/duplicate/toggle
- Unsaved changes warning
- 27 block types supported in AddBlockDialog

**Missing / needs work:**
- Global sections `global_header_top`, `global_header_bottom`, `global_footer_top`, `global_footer_bottom`, `global_before_main`, `global_after_main` not exposed in page selector
- No background editor in VisualEditor (exists as standalone `PageBackgroundEditor` but not integrated)
- AddBlockDialog has no categories, search, or descriptions
- No block type missing from `createDefaultContent` for newer types (social_proof, testimonials, gallery, countdown, divider, recently_viewed, gift_finder)
- EditorToolbar page selector doesn't show dedicated Header Top/Bottom entries

### Changes

#### 1. Expose All Global Sections in Editor Toolbar
**File:** `src/components/admin/editor/EditorToolbar.tsx`

Add all 6 global section slots to the page selector dropdown under "Global Sections":
- `global_header_top` → "Above Header"
- `global_header_bottom` → "Below Header"
- `global_before_main` → "Before Content"
- `global_after_main` → "After Content"
- `global_footer_top` → "Above Footer"
- `global_footer_bottom` → "Below Footer"

Update the `onValueChange` handler to auto-create these global pages on first access (extend existing logic in `VisualEditorContext.setActivePage`).

#### 2. Auto-Create All Global Section Pages
**File:** `src/contexts/VisualEditorContext.tsx`

Extend `setActivePage` to auto-create any `global_*` page if it doesn't exist, not just `global_header`/`global_footer`. Use a mapping for display names.

#### 3. Add Missing Block Default Content
**File:** `src/contexts/VisualEditorContext.tsx`

Add `createDefaultContent` cases for: `social_proof`, `testimonials`, `gallery`, `countdown`, `divider`, `recently_viewed`, `gift_finder`, `banner`, `cta`, `button`, `video`, `newsletter`, `embed`, `image`, `carousel`.

#### 4. Categorized Add Block Dialog with Search & Descriptions
**File:** `src/components/admin/editor/AddBlockDialog.tsx`

Redesign:
- Group blocks into categories: Content, Commerce, Social, Media, Navigation, Conversion, Layout
- Add short description per block type
- Add search/filter input at top
- Keep existing grid layout within each category section
- Use collapsible category headers

#### 5. Integrate Background Editor into Visual Editor
**File:** `src/pages/admin/VisualEditor.tsx`

Add a "Background" button to the toolbar that opens the existing `PageBackgroundEditor` as a dialog/sheet. Pass the active page context so it supports both global and page-specific backgrounds.

**File:** `src/components/admin/editor/EditorToolbar.tsx`

Add a background settings button (paint icon) next to page settings.

#### 6. Add Missing Block Icons & Colors to LayersPanel
**File:** `src/components/admin/editor/LayersPanel.tsx`

Add entries for `social_proof`, `testimonials`, `gallery`, `recently_viewed`, `gift_finder`, `countdown`, `divider` to `BLOCK_ICONS` and `BLOCK_COLORS` maps.

### Files Summary

| File | Action |
|------|--------|
| `src/components/admin/editor/EditorToolbar.tsx` | Add global section entries, background button |
| `src/contexts/VisualEditorContext.tsx` | Extend auto-create for all global pages, add missing default content |
| `src/components/admin/editor/AddBlockDialog.tsx` | Categorized layout with search and descriptions |
| `src/pages/admin/VisualEditor.tsx` | Integrate PageBackgroundEditor |
| `src/components/admin/editor/LayersPanel.tsx` | Add missing block icons/colors |

### Technical Notes
- No database changes needed — global sections already use `site_pages` with `page_type: "global"` and `site_blocks` for content
- Background editor already exists and works with `site_settings` — just needs UI integration
- All block types already have renderers in `BlockRenderer.tsx` and editor configs in `BlockFieldGroups.tsx`
- Preview already works for global pages via `EditorCanvas`
- Draft/publish workflow already handles all page types uniformly

