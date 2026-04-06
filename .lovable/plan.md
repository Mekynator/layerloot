

# Audit & Refactor: Remove Static Fallback Rendering Platform-Wide

## Current Architecture Analysis

The platform has two rendering paths:
1. **DynamicPage** — pure DB-driven block renderer (used by Home/Index wrapper, About, and catch-all `/:slug` routes). Correctly respects `is_active`, `sort_order`, and publish state.
2. **Hybrid pages** — pages with their own dedicated React components that fetch `site_blocks` independently AND render hardcoded static JSX alongside them. The static JSX bypasses visibility controls.

### Pages with Static/Hybrid Rendering (the problem)

| Page | Static JSX present | Uses `isVisible()` | Fully DB-driven |
|------|-------------------|-------------------|-----------------|
| **Home (Index.tsx)** | SmartHomeSections, HomeSocialProof | Yes (partial) | No — static sections rendered after DynamicPage |
| **Products** | Header/sidebar, product grid, search | Yes (partial) | No — static grid/header always rendered alongside DB blocks |
| **Contact** | Contact form, contact info sidebar | No | No — form always renders |
| **Gallery** | Gallery grid, upload dialog | No | No — gallery always renders |
| **CreateYourOwn** | Tabs (custom print, lithophane, gift finder) | No | No — tools always render |
| **Creations** | Showcase tabs, community gallery | No | No — tabs always render |
| **SubmitDesign** | Upload form | No | No — form always renders |
| **Cart** | Cart items, summary, upsell | No | No — cart always renders |
| **Account** | Dashboard, orders, settings | No | No — dashboard always renders |
| **OrderTracking** | Order detail, timeline | No | No — purely static |
| **ProductDetail** | Product page (images, reviews, Q&A) | No | No — purely static |
| **Policies** | Markdown from `site_settings` + hardcoded defaults | No | No — uses fallback defaults |
| **Footer** | Contact info, nav links | No | N/A — layout component |
| **Header** | Navigation | No | N/A — layout component |

### Static Section Definitions (in `static-page-sections.ts`)

Defined for: `home`, `products`, `contact`, `gallery`, `create`, `creations`, `submit-design`, `cart`, `account`, `order-tracking`. These appear in the Visual Editor as configurable items but their visibility toggles only work for `home` and `products` (the only two pages calling `useStaticSectionSettings`).

### Core Problem

- 10+ pages define static sections in the editor but don't check `isVisible()` before rendering
- Contact, Gallery, CreateYourOwn, Creations, SubmitDesign, Cart, Account, OrderTracking all render their core content unconditionally
- Policies page uses hardcoded fallback content that can't be toggled off
- The Visual Editor shows visibility toggles for sections that have no effect

## Proposed Solution

### Approach: Add `useStaticSectionSettings` to all hybrid pages

Rather than migrating all static content into DB blocks (which would break functional components like forms, cart logic, auth flows), the correct approach is:

1. **Wire up `useStaticSectionSettings` on every hybrid page** so each static section's visibility toggle actually works
2. **Remove hardcoded fallback content** from Policies (use empty state instead of default policy text when no saved content exists — or keep defaults but make them editable-only, not hardcoded render)
3. **Ensure no page renders static content that has been toggled off in the editor**

### Implementation Steps

#### Step 1: Wire visibility checks on all hybrid pages

For each page listed below, import `useStaticSectionSettings` and wrap static sections in `isVisible()` guards:

- **Contact.tsx** — wrap contact form section in `isVisible("static_contact_form")`
- **Gallery.tsx** — wrap gallery grid in `isVisible("static_gallery_grid")`  
- **CreateYourOwn.tsx** — wrap hero in `isVisible("static_create_hero")`, tools tabs in `isVisible("static_create_tools")`
- **Creations.tsx** — wrap showcase in `isVisible("static_creations_showcase")`
- **SubmitDesign.tsx** — wrap form in `isVisible("static_submit_form")`
- **Cart.tsx** — wrap cart view in `isVisible("static_cart_items")`
- **Account.tsx** — wrap dashboard in `isVisible("static_account_dashboard")`
- **OrderTracking.tsx** — wrap tracking in `isVisible("static_order_tracking")`

#### Step 2: Migrate page-level block fetching to `usePageBlocks` hook

Several hybrid pages (Contact, Gallery, CreateYourOwn, Creations, SubmitDesign) manually fetch blocks with `useEffect` + `useState`. Refactor these to use the existing `usePageBlocks` hook for consistency, which already handles `is_active` filtering.

#### Step 3: Policies fallback cleanup

Remove the `defaultPolicies` hardcoded object from `Policies.tsx`. If no saved content exists for a policy, show a clean empty state instead of rendering hardcoded placeholder text that can't be controlled from the editor.

#### Step 4: Ensure preview/live consistency

The `DynamicPage` renderer already filters `is_active !== false`. The hybrid pages' static sections will now also respect the same visibility source. The Visual Editor's `StaticSectionPreview` component already renders previews correctly — no changes needed there.

#### Step 5: Duplicate rendering prevention

Audit `Index.tsx` specifically — it renders `DynamicPage` (which loads DB blocks for "home") AND then renders `SmartHomeSections` and `HomeSocialProof` statically below. If those same sections were also added as DB blocks, they'd render twice. Add deduplication: if a DB block with matching `block_type` exists for a static section ID, skip the static render.

### Files to Modify

1. `src/pages/Contact.tsx` — add `useStaticSectionSettings`, use `usePageBlocks`, wrap form
2. `src/pages/Gallery.tsx` — add `useStaticSectionSettings`, use `usePageBlocks`, wrap grid
3. `src/pages/CreateYourOwn.tsx` — add `useStaticSectionSettings`, use `usePageBlocks`, wrap hero + tools
4. `src/pages/Creations.tsx` — add `useStaticSectionSettings`, use `usePageBlocks`, wrap showcase
5. `src/pages/SubmitDesign.tsx` — add `useStaticSectionSettings`, use `usePageBlocks`, wrap form
6. `src/pages/Cart.tsx` — add `useStaticSectionSettings`, wrap cart section
7. `src/pages/Account.tsx` — add `useStaticSectionSettings`, wrap dashboard
8. `src/pages/OrderTracking.tsx` — add `useStaticSectionSettings`, wrap tracking
9. `src/pages/Policies.tsx` — remove hardcoded default policy content, use empty state
10. `src/pages/Index.tsx` — add deduplication guard for static sections vs DB blocks

### What stays unchanged

- `DynamicPage.tsx` — already correct
- `BlockRenderer` — already correct
- `static-page-sections.ts` — definitions are correct, just unused by most pages
- `StaticSectionPreview.tsx` — editor previews are correct
- Header/Footer — these are layout components, not editor-managed content blocks (they use their own settings system which is already working)
- `GlobalSectionRenderer` — already correct, filters by `is_active`

### Backward Compatibility

- All pages keep their existing layout and design
- `isVisible()` defaults to `true` when no settings are saved, so nothing breaks for existing sites
- Policies will show empty state only if admin explicitly clears content (existing saved content continues to work)
- No database changes needed

