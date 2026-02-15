

# Admin Access and Visual Page Editor Overhaul

## Overview

This plan restructures how the admin accesses the dashboard and completely reimagines the Page Editor to work as an inline, frontend overlay -- similar to tools like Squarespace or Wix -- where the admin edits the actual live pages directly.

---

## 1. Admin Icon in Header (Next to Cart)

**Current behavior:** Admin Dashboard is buried inside the user dropdown menu.

**New behavior:** A visible Shield icon button appears in the header, right next to the Cart icon, only for logged-in admin users. Clicking it navigates to `/admin`.

**Changes:**
- `src/components/layout/Header.tsx` -- Add a `<Link to="/admin">` with a Shield icon button between the Cart button and the User button, wrapped in `{isAdmin && (...)}`.

---

## 2. Page Editor as Frontend Overlay

**Current behavior:** The page editor lives inside the admin sidebar layout (`/admin/content`) showing mock previews of blocks.

**New behavior:** The page editor becomes an overlay mode that loads the actual page (Home, Products, Contact, etc.) and lets the admin click on any block to edit it, drag blocks to reorder, add new blocks, and delete blocks -- all while viewing the real rendered page.

### Architecture

```text
+--------------------------------------------------+
| Admin Edit Toolbar (top bar)                     |
| [Page selector] [+ Add Block] [Save] [Exit]     |
+--------------------------------------------------+
|                                                  |
|  Actual rendered page content (e.g. Home)        |
|  with hover outlines and click-to-edit overlays  |
|                                                  |
|  [Hero block]        <- click to edit            |
|  [Featured Products] <- click to edit            |
|  [CTA block]         <- click to edit            |
|                                                  |
+--------------------------------------------------+
| Block Properties Panel (slide-in from right)     |
+--------------------------------------------------+
```

### New Files

- **`src/pages/admin/PageEditor.tsx`** -- The main page editor route. This component:
  - Renders a floating admin toolbar at the top with: page selector dropdown (home, products, contact, + create new page, delete page), an "Add Block" button, and an "Exit Editor" button.
  - Fetches `site_blocks` for the selected page and renders them using the same rendering components used on the actual frontend pages (reuse from `Index.tsx`).
  - Wraps each block in an `EditableBlockWrapper` that:
    - Shows a dashed border and toolbar on hover (edit, move up/down, duplicate, delete, drag handle).
    - Uses HTML5 drag-and-drop for reordering (same pattern as current `AdminContent.tsx`).
    - On click, opens a right-side slide-in panel to edit the block's content fields.
  - Includes a "+" drop zone between blocks to insert new blocks at any position.
  - Has a "Create New Page" dialog that adds a new page slug to the `pages` list (stored in `site_settings`).
  - Has a "Delete Page" option that removes all blocks for that page.

- **`src/components/admin/EditableBlockWrapper.tsx`** -- Reusable wrapper component that adds hover controls, drag-and-drop, and click-to-edit behavior around any block.

- **`src/components/admin/BlockEditorPanel.tsx`** -- Right-side slide-in panel (Sheet component) containing the form fields for editing the selected block's content (heading, subheading, images, links, etc.). Reuses the same field logic from the current `AdminContent.tsx`.

- **`src/components/admin/BlockRenderer.tsx`** -- Extracted shared component that renders a `site_block` as it appears on the frontend (Hero, Text, Image, Carousel, Video, CTA, Button, Spacer, HTML, Banner). Used by both the page editor and the actual frontend pages (Index, Contact, etc.) so rendering is consistent.

### Changes to Existing Files

- **`src/App.tsx`** -- Add route `/admin/editor` pointing to `PageEditor.tsx`.
- **`src/components/admin/AdminLayout.tsx`** -- Update "Page Editor" sidebar link to point to `/admin/editor` instead of `/admin/content`.
- **`src/pages/admin/AdminContent.tsx`** -- Kept as a fallback/list view but the primary editor becomes `/admin/editor`.
- **`src/pages/Index.tsx`** -- Refactor block rendering into `BlockRenderer.tsx` and import it, so blocks look identical in both places.

### Page Management Features
- **Create page**: Dialog with a text input for page name/slug. Saves the page list to `site_settings` under key `"custom_pages"`. Also adds a route dynamically.
- **Delete page**: Confirmation dialog that deletes all `site_blocks` with that page value.
- **Link buttons between pages**: The Button block type already supports `button_link` -- the editor will show a page selector dropdown for internal links.

---

## 3. Dynamic Page Routing for Custom Pages

- **`src/pages/DynamicPage.tsx`** -- New page component that takes a slug from the URL, fetches `site_blocks` for that slug, and renders them using `BlockRenderer.tsx`.
- **`src/App.tsx`** -- Add a catch-all route `/pages/:slug` that renders `DynamicPage.tsx` for admin-created custom pages.
- **Header nav** -- Optionally fetch custom pages from `site_settings` to show them in navigation.

---

## Technical Details

### Drag and Drop
- Uses HTML5 native drag-and-drop (same approach as current implementation).
- `onDragStart`, `onDragOver`, `onDragEnd` handlers update `sort_order` in the database via Supabase.

### Block Editing Flow
1. Admin hovers over a block -- dashed outline + toolbar appears.
2. Admin clicks "Edit" (pencil icon) -- right panel slides in with form fields.
3. Admin modifies content -- changes auto-save or save on "Apply" button click.
4. Block re-renders in real-time with updated content.

### Database
- No schema changes needed. Uses existing `site_blocks` and `site_settings` tables.
- Custom pages stored in `site_settings` with key `"custom_pages"` as a JSON array of `{ slug, title }`.

### Files Summary

| Action | File |
|--------|------|
| Create | `src/pages/admin/PageEditor.tsx` |
| Create | `src/components/admin/EditableBlockWrapper.tsx` |
| Create | `src/components/admin/BlockEditorPanel.tsx` |
| Create | `src/components/admin/BlockRenderer.tsx` |
| Create | `src/pages/DynamicPage.tsx` |
| Edit | `src/App.tsx` (add routes) |
| Edit | `src/components/layout/Header.tsx` (admin icon next to cart) |
| Edit | `src/components/admin/AdminLayout.tsx` (update page editor link) |
| Edit | `src/pages/Index.tsx` (use shared BlockRenderer) |

