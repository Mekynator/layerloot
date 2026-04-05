

## Complete Mobile Optimization Pass — All Remaining Areas

This is a large scope. The plan focuses on highest-impact, deliverable changes grouped by area. Many components already have decent responsive basics (2-col grids, stacked layouts) — the work is about polish, interaction fixes, and performance.

### 1. Header & Mobile Navigation

**File:** `src/components/layout/Header.tsx`

- **Mobile menu**: Currently a simple slide-down list. Add proper touch targets (min `py-3.5` per link), visual separators between items, and a cart/account quick-access row at the bottom of the mobile menu.
- **AccountDropdown**: The dropdown uses `onMouseEnter`/`onMouseLeave` — completely broken on mobile (can't hover). Fix by adding `onClick` toggle on mobile via `useIsMobile()`. Same for **MiniCart** hover dropdown.
- **Header height**: Already compact at `h-16`. No change needed.
- **Backdrop blur**: Already reduced on mobile via CSS. No change.

**File:** `src/components/layout/AccountDropdown.tsx`
- Add `onClick` toggle alongside hover handlers. On mobile, tapping the user icon opens/closes the dropdown. Tapping outside closes it.

**File:** `src/components/layout/MiniCart.tsx`
- Same fix: add `onClick` toggle for mobile. The hover dropdown is invisible on touch devices. On mobile, redirect to `/cart` directly instead of showing a dropdown (simpler, faster).

### 2. Footer Mobile Optimization

**File:** `src/components/layout/Footer.tsx`

- On mobile (`col-span-2` logo area is fine), make the 5-column grid collapse to a single stacked column with collapsible accordion sections for Quick Links, Account, Policies, and Contact. Use `<details>/<summary>` or a simple toggle state per section.
- Remove `whileHover={{ y: -2 }}` from social icons on mobile.
- Reduce `py-10` to `py-8` on mobile for tighter footer.

### 3. Products Page — Filters & Grid

**File:** `src/pages/Products.tsx`

- **Mobile filter drawer**: The sidebar (`aside`) is full-width on mobile, pushing content down. Convert to a slide-in sheet/drawer triggered by a filter button. On mobile, hide the sidebar by default and show a "Filters" button that opens a `Sheet` from the bottom.
- **Category buttons**: Add `whileHover={undefined}` on mobile (remove `whileHover={{ x: 2 }}`).
- **Product grid**: Already `grid-cols-2` on mobile. Ensure gap is `gap-3` on mobile for tighter cards.
- **Search input**: Already responsive. Ensure it gets full width.

### 4. Cart Page Mobile Polish

**File:** `src/pages/Cart.tsx`

- **Cart title**: Reduce `text-4xl` to `text-2xl` on mobile.
- **Cart items**: The `flex-col md:flex-row` layout is correct. Tighten image size from `h-24 w-24` to `h-20 w-20` on mobile.
- **Quantity controls**: Already `h-9 w-9` — adequate touch targets.
- **Cart summary sidebar**: On mobile, the `lg:grid-cols-[1.4fr_0.8fr]` already stacks. Add a sticky checkout CTA at the bottom of the page on mobile with safe area padding.
- **CheckoutSavingsPanel**: Ensure it doesn't overflow on mobile — check its internal layout.

### 5. Account Pages Mobile Polish

**File:** `src/pages/Account.tsx`

- **Header**: Reduce `text-2xl lg:text-3xl` greeting — already responsive. Stack admin/logout buttons vertically on very small screens.
- **Mobile tab pills**: Already has horizontal scrollable pills. Ensure they have minimum tap targets (`min-h-[44px]`).
- **Content area**: Already full-width on mobile. No structural change needed.

**File:** `src/components/account/ReferralModule.tsx`
- Stats grid: `sm:grid-cols-2 lg:grid-cols-4` — on mobile it's already 1-col. Ensure cards don't overflow.
- Invite link input: ensure full-width and copy button is easy to tap.

**File:** `src/components/account/RewardsModule.tsx`
- Reward cards: ensure they stack properly and redeem buttons have adequate size.

### 6. CreateYourOwn (Custom Order) Mobile Polish

**File:** `src/pages/CreateYourOwn.tsx`

- This is a 1572-line file with multi-step form. Key fixes:
  - Ensure upload drop zone works on mobile (file input, not just drag)
  - Reduce oversized headings and card padding on mobile
  - Ensure the 3D model preview doesn't dominate — already handled by ModelViewer changes
  - Ensure tabs (`TabsList`) are scrollable on mobile if they overflow
  - Make material/color selection swatches large enough to tap (min 44px)

### 7. Global Performance & Interaction Fixes

**File:** `src/index.css`
- Already has mobile performance optimizations (no blobs, reduced blur). Add:
  - `@media (max-width: 767px) { .glass-card:hover { transform: none; } }` — already done, verify.
  - Ensure `card-interactive:hover` transform is disabled on mobile — already done.

**File:** `src/components/smart/SmartHomeSections.tsx`
- Verify mobile grid is `grid-cols-2` not wider. Add responsive image sizing.

**File:** `src/components/social/HomeSocialProof.tsx`
- Verify cards stack properly on mobile.

### 8. Dynamic Page Blocks Mobile Defaults

**File:** `src/components/admin/BlockRenderer.tsx`
- In `withSection()`, ensure all blocks get `px-4` container padding on mobile (already via `container` class).
- Review `HeroBlock`, `TextBlock`, `FeaturedProductsBlock`, `CategoriesBlock` for mobile text sizing and spacing. Reduce `text-5xl`/`text-6xl` hero headings to `text-3xl` on mobile.

### Files Summary

| File | Changes |
|------|---------|
| `src/components/layout/Header.tsx` | Mobile menu touch targets, spacing |
| `src/components/layout/AccountDropdown.tsx` | Add click toggle for mobile |
| `src/components/layout/MiniCart.tsx` | Mobile: redirect to /cart instead of hover dropdown |
| `src/components/layout/Footer.tsx` | Collapsible sections on mobile, remove hover lifts |
| `src/pages/Products.tsx` | Filter drawer on mobile, remove hover motions, tighten grid |
| `src/pages/Cart.tsx` | Smaller title/images on mobile, sticky checkout CTA |
| `src/pages/Account.tsx` | Tab pill touch targets |
| `src/pages/CreateYourOwn.tsx` | Upload zone, tab scroll, swatch sizing for mobile |
| `src/components/admin/BlockRenderer.tsx` | Hero heading mobile sizing |
| `src/components/smart/SmartHomeSections.tsx` | Verify mobile grid |

### What's NOT in this phase
- Bottom sheet pattern for all modals (significant refactor, separate phase)
- Image srcset/responsive loading (requires backend pipeline)
- Full admin panel mobile optimization (admin is desktop-primary)
- Lazy loading framework changes (already deferred via React patterns)

### Technical Notes
- No database changes needed
- All changes are CSS/component-level
- `useIsMobile()` hook already available
- No new dependencies

