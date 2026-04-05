

## Page Editor Polish: Block Controls, Tile Layout, Section Dimensions

### Scope Assessment

The request covers ~15 major areas. Many are **already implemented** in varying degrees:

**Already working:**
- Block title, show/hide, duplicate, delete, move up/down, drag reorder — all in `EditorCanvas.tsx`
- Section spacing (padding, margin, gap) — in `AdvancedStyleEditor`
- Background color/image/overlay — in `AdvancedStyleEditor`
- Section width (default/narrow/wide/full) — in `AdvancedStyleEditor`
- Responsive device overrides — in `ResponsiveEditor`
- Featured products tile settings (layout mode, columns, spacing, arrows, dots, autoplay, card min width, mobile overrides) — in `SettingsPanel.tsx` lines 684-774
- Non-interactive preview mode — `isEditorPreviewMode()` disables all navigation
- Block hover/selected outlines — in `EditorCanvas.tsx`
- Anchor ID, custom CSS class — in Settings tab

**Needs to be built or extended:**

### Plan

#### 1. Extract Reusable `TileSectionControls` Component
**File:** `src/components/admin/editor/controls/TileSectionControls.tsx` (new)

Extract the tile settings controls currently hardcoded inside `SettingsPanel.tsx` (lines 684-774) for `featured_products` into a standalone reusable component. This component renders all `ProductTileSectionSettings` fields with a `tile`-prefixed content key pattern. It will be reusable for any product-listing block type.

Controls included: layout mode (grid/carousel), grid columns, max items, spacing, card min width, card height, show title, show subtitle, show badge, show arrows, show dots, auto slideshow, slideshow speed, loop, drag/scroll, mobile columns, mobile layout mode.

#### 2. Add `TileSectionControls` to Categories Block
**File:** `src/components/admin/editor/SettingsPanel.tsx`

After the existing `categories` limit slider (line 675-682), add the `TileSectionControls` accordion so categories can also be switched between grid/carousel, control columns, spacing, etc.

#### 3. Wire Category Tile Settings in `BlockRenderer.tsx`
**File:** `src/components/admin/BlockRenderer.tsx`

Update `CategoriesBlock` (line 1143) to read `tileLayoutMode`, `tileGridColumns`, `tileSpacing`, `tileShowTitle`, `tileShowSubtitle` from block content and use them instead of hardcoded `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Add carousel mode support similar to `FeaturedProductsBlock`.

#### 4. Add Category Selection & Manual Ordering
**File:** `src/components/admin/editor/SettingsPanel.tsx`

For `categories` block type, add:
- Source toggle: "Automatic" (from DB sort_order) vs "Manual" (admin picks specific categories)
- When manual: show a multi-select of available categories with reorder controls
- "Hide empty categories" toggle
- Store as `content.categorySource`, `content.selectedCategories`, `content.hideEmpty`

**File:** `src/components/admin/BlockRenderer.tsx`
Update `CategoriesBlock` to respect manual category selection and ordering.

#### 5. Add Product Source Controls for `featured_products`
**File:** `src/components/admin/editor/SettingsPanel.tsx`

Add a "Product Source" dropdown for `featured_products`:
- Options: featured (default), best sellers, newest, discounted, by category, manual
- Store as `content.productSource`
- For "by category": show category picker
- For "manual": show product multi-select

**File:** `src/components/admin/BlockRenderer.tsx`
Update `FeaturedProductsBlock` to pass source/filter params to the data hook.

#### 6. Add `showBadge` Toggle to `featured_products` and `categories`
**File:** `src/components/admin/editor/SettingsPanel.tsx`

Already partially done via `TileSectionControls`. Ensure `showBadge` toggle is included. The badge (small blue label) visibility is already consumed by `SmartRecommendationSection` but not by `FeaturedProductsBlock` — add that.

#### 7. Section Content Width Control for Product/Category Blocks
Already available via `AdvancedStyleEditor` → "Section Width" dropdown (default/narrow/wide/full). The `sectionStyle()` function doesn't currently apply width classes. 

**File:** `src/components/admin/BlockRenderer.tsx`
In `withSection()`, apply width class based on `content.sectionWidth`:
- `narrow`: `max-w-4xl mx-auto`
- `wide`: `max-w-[1400px] mx-auto`
- `full`: no container constraint
- `default`: existing `container` class

#### 8. Scroll-to-Selected-Block in Canvas
**File:** `src/components/admin/editor/EditorCanvas.tsx`

When `selectedBlockId` changes, scroll the matching block wrapper into view using `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

#### 9. Collapsible Settings Groups
Already implemented — the tile settings use `<Accordion>` with collapsible groups. The Style tab uses flat layout. No change needed for this phase.

### Files to Create/Edit

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/editor/controls/TileSectionControls.tsx` | Create | Reusable tile layout/carousel/grid controls |
| `src/components/admin/editor/SettingsPanel.tsx` | Edit | Use TileSectionControls for featured_products and categories; add product source + category selection |
| `src/components/admin/BlockRenderer.tsx` | Edit | Wire category tile settings, section width, product source |
| `src/components/admin/editor/EditorCanvas.tsx` | Edit | Scroll-to-selected-block |
| `src/components/admin/editor/editable-schema.ts` | Edit | Add tile layout nodes to categories schema |

### What's NOT in scope for this phase
- Full manual product picker UI (complex multi-select with search — stub the control, full implementation in next phase)
- Cart/checkout discount feedback (separate concern)
- Custom pages tile settings (will inherit automatically from the reusable component)

### Technical Notes
- The `ProductTileSectionSettings` schema already exists in `src/lib/product-tile-section-settings.ts` — the new `TileSectionControls` component maps 1:1 to its fields using `tile`-prefixed content keys
- `SmartRecommendationSection` already consumes these settings — homepage recommendations will benefit once admin wiring is added
- All changes are additive — no existing functionality is broken
- Settings are stored in `site_blocks.content` JSON, persisted on save, and read by renderers

