

## Mobile Optimization: Performance, Layout & UX

This is a large scope request. To keep it practical and deliverable, this plan focuses on the highest-impact changes across 5 key areas, prioritized by user experience and performance impact.

### 1. Performance: Reduce Heavy Effects on Mobile

**Files:** `src/index.css`, `src/components/layout/Layout.tsx`

- **Ambient blobs**: Hide on mobile via `@media (max-width: 767px)` — set `.ambient-blob { display: none }`. These cause GPU compositing overhead with 140px blur on every frame.
- **Grid overlay + noise texture**: Hide on mobile — zero user value, costs GPU layers.
- **Backdrop-blur reduction**: Add media query to reduce `backdrop-blur-xl` to `backdrop-blur-sm` on mobile for `.glass`, `.glass-card`, `.glass-nav` classes. Heavy blur is the #1 mobile GPU cost.

### 2. ProductCard: Mobile-First Quick-Add & Hover Fixes

**File:** `src/components/ProductCard.tsx`

- The "Quick Add" button is hover-only (`opacity: isHovered ? 1 : 0`). On mobile, it's invisible. Fix: always show the button on mobile (check `useIsMobile()` or use CSS `@media` to force `opacity: 1`).
- The "view arrow" is also hover-only — hide it on mobile entirely (not useful for tap).
- The hover `translateY(-8px)` lift effect on cards — disable on mobile (causes layout shift on touch).
- Reduce `AnimatePresence` image crossfade on mobile — simplify to instant swap to reduce GPU work.

### 3. ModelViewer: Static Default, No Auto-Rotate

**File:** `src/components/ModelViewer.tsx`

- Change `autoRotate` default from `true` to `false` (line 310). The model should face the user statically on load.
- Reduce Canvas `dpr` to `[1, 1.5]` on mobile (currently `[1, 2]`) to cut GPU pixel fill cost.
- The touch interactions (rotate, pinch-zoom) already work via `ArcballControls` — no changes needed there.

### 4. Product Detail Page: Mobile Layout Polish

**File:** `src/pages/ProductDetail.tsx`

- Gallery thumbnails: already responsive (`h-14 w-14` mobile, `h-16 w-16` desktop). Add touch-swipe support on the main hero image using `onTouchStart`/`onTouchEnd` handlers to change `currentImage` on swipe left/right.
- Remove `whileHover={{ y: -2 }}` from section containers on mobile — these cause layout jitter. Wrap in a `motion.div` that only applies hover on desktop.
- Review form card: change `md:grid-cols-[1fr_auto]` to stack vertically on mobile — already works but button alignment can be improved with `w-full` on mobile.
- Sticky add-to-cart bar: already works well. Add `pb-safe` (safe area inset) for iPhone notch/bar.

### 5. Global Mobile Spacing & Touch Targets

**File:** `src/index.css`

- Add mobile-specific tap target sizing: ensure all interactive elements have minimum `44px` touch targets via a utility class or base styles.
- Add `env(safe-area-inset-bottom)` padding to fixed bottom bars (sticky cart, floating cart summary).

**File:** `src/components/cart/FloatingCartSummary.tsx`
- Add bottom safe area padding for iOS devices.

**File:** `src/components/smart/SmartHomeSections.tsx`, `src/components/social/HomeSocialProof.tsx`
- Review and ensure mobile grid columns are `grid-cols-1` or `grid-cols-2` (not wider) on mobile.

### 6. Image Gallery Swipe Support

**File:** `src/pages/ProductDetail.tsx`

- Add touch swipe handler to the hero image area. Track `touchStartX` and `touchEndX`, and on swipe threshold (>50px), navigate to prev/next image. This replaces the need for arrow buttons on mobile (which already exist but are small).

### Files to Edit

| File | Changes |
|------|---------|
| `src/index.css` | Hide ambient blobs/grid/noise on mobile, reduce blur, safe area padding |
| `src/components/ModelViewer.tsx` | Default `autoRotate=false`, reduce mobile DPR |
| `src/components/ProductCard.tsx` | Always-visible add button on mobile, disable hover lift |
| `src/pages/ProductDetail.tsx` | Touch swipe on gallery, remove hover lifts on mobile |
| `src/components/layout/Layout.tsx` | No structural changes needed (CSS handles blob hiding) |
| `src/components/cart/FloatingCartSummary.tsx` | iOS safe area bottom padding |
| `src/components/product/StickyAddToCart.tsx` | iOS safe area bottom padding |

### What This Does NOT Cover (Next Phase)
- Full component-by-component responsive audit of every admin page
- Lazy loading of 3D viewer (already loaded on-demand via toggle)
- Image optimization/srcset (requires backend image pipeline)
- Bottom sheet pattern for modals (significant refactor)

### Technical Notes
- No database changes needed
- All changes are CSS/component-level, no new dependencies
- `useIsMobile()` hook already exists and can be used where JS-level mobile detection is needed
- `prefers-reduced-motion` media query already exists — new mobile optimizations will respect it

