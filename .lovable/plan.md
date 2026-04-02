

# Redesign Gift Finder — Premium Visual-First Experience

## Current State
The Gift Finder is a tab inside `CreateYourOwn.tsx` (lines 801–1003). It shows icon+label buttons in a grid, with inline product results below. The `gift_finder_tags` table has `name`, `slug`, `icon_key`, `sort_order`, `is_active`. No image support exists on tags.

## Plan

### 1. Database Migration — Add image fields to `gift_finder_tags`
Add columns:
- `image_url TEXT` — background image for card
- `image_opacity NUMERIC DEFAULT 0.3` — overlay opacity
- `image_fit TEXT DEFAULT 'cover'` — cover/contain/stretch

### 2. Extract GiftFinder to its own component
Create `src/components/gift-finder/GiftFinderSection.tsx` — extracted from `CreateYourOwn.tsx` lines 801–1003, then redesigned.

### 3. Redesign the Gift Finder UI

**Layout:**
- Center-aligned header: small "Gift Finder" label + "Find the Best Match" title
- Subtle hint: "AI will recommend the best products for you"
- Remove all helper/description text ("Pick one or more vibes", "Smarter matching…")
- Max-width container, generous vertical spacing

**Tag Cards (core redesign):**
- Responsive grid: 3–4 cols desktop, 2 mobile
- Each card: icon (top-center), label (center), optional background image with gradient overlay
- States:
  - Default: dark surface, soft border, muted icon
  - Hover: `scale(1.03)`, blue glow border, icon brightens
  - Selected: strong glow border, filled background, checkmark top-right, subtle pulse
- Images lazy-loaded with `loading="lazy"`

**Selection UX:**
- Multi-select with animated transitions
- Selection counter: "3 selected" displayed above/below grid
- Selected tag chips removed (replaced by in-card checkmarks)

**CTA System:**
- "Find Matches (X selected)" button — hidden when 0 selected, slides in when ≥1
- "Browse all products" secondary link below
- Both animated with framer-motion fade/slide

**Results inline** (kept as-is but polished) — products shown below with match scoring. This prepares for a future dedicated results page.

### 4. Admin — Image management for tags
Update `AdminCategories.tsx` Gift Finder Tags form to add:
- Image upload field (to `site-assets` bucket)
- Image opacity slider
- Image fit selector (cover/contain/stretch)

### 5. Files Changed

| File | Change |
|------|--------|
| `supabase migration` | Add `image_url`, `image_opacity`, `image_fit` to `gift_finder_tags` |
| `src/components/gift-finder/GiftFinderSection.tsx` | **New** — extracted and redesigned Gift Finder component |
| `src/pages/CreateYourOwn.tsx` | Replace inline `GiftFinder` with import of new component |
| `src/pages/admin/AdminCategories.tsx` | Add image upload, opacity slider, fit selector to Gift Finder Tags form |

### 6. Scope Boundaries
- **Included:** Visual redesign, image support, selection UX, CTA, admin editing
- **Deferred (next phase):** Occasion filters, smart preview tooltips on hover, dedicated results page, AI suggestion section ("People who chose this also liked…")
- **Not changing:** Database query logic, product matching/scoring, product_gift_finder_tags table

