

## Final Mobile Performance, QA & Polish Pass

This is a refinement phase — no new features, just optimization and stabilization of what exists.

### Analysis

After reviewing the codebase, the previous mobile passes already covered the major structural changes. What remains are targeted performance wins and consistency fixes:

**Already done well:**
- Ambient blobs/grid/noise hidden on mobile
- Backdrop-blur reduced on mobile
- Hover lifts disabled on mobile
- ProductCard has mobile-visible add button
- Footer has collapsible sections
- Products page has mobile filter drawer
- Hero headings scale responsively
- Safe area padding on sticky bars

**Remaining issues found:**

1. **HomeSocialProof cards** still have `hover:-translate-y-2` inline (not caught by CSS mobile override since it's inline Tailwind, not `.glass-card`)
2. **ProductCard** uses `AnimatePresence` with crossfade for image cycling — expensive on mobile with many cards on screen
3. **ProductCard** entrance animation has staggered delay (`index * 0.08`) — with 10+ cards this causes visible delay
4. **HomeSocialProof** recent prints grid is `md:grid-cols-3 xl:grid-cols-4` — on mobile defaults to 1-col, should be 2-col
5. **ChatWidget** is 669 lines, always mounted — should be lazy loaded
6. **PromotionPopup** and **GiftClaimPopup** always mounted — should be lazy
7. **Loading skeletons** use `aspect-square` but ProductCard uses `aspect-[4/5]` — mismatch causes CLS
8. **`page-enter` animation** on every route change adds 400ms perceived delay

### Changes

#### 1. Lazy Load Heavy Non-Critical Components
**File:** `src/App.tsx`

Wrap `ChatWidget`, `PromotionPopup`, and `GiftClaimPopup` in `React.lazy` + `Suspense`. These are non-critical overlays that don't need to block initial render.

#### 2. Fix HomeSocialProof Mobile Layout
**File:** `src/components/social/HomeSocialProof.tsx`

- Change recent prints grid from `grid gap-4 md:grid-cols-3 xl:grid-cols-4` to `grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4`
- Change popular products grid from `grid gap-6 sm:grid-cols-2 xl:grid-cols-4` to `grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4`
- Remove `hover:-translate-y-2` from recent prints cards (replace with conditional via CSS or remove entirely — the CSS mobile override doesn't catch inline Tailwind classes)
- Reduce `space-y-16 py-16` to `space-y-10 py-10 lg:space-y-16 lg:py-20` on mobile

#### 3. Optimize ProductCard Rendering
**File:** `src/components/ProductCard.tsx`

- Reduce entrance animation delay cap: change `delay: index * 0.08` to `delay: Math.min(index * 0.06, 0.3)` so cards beyond 5th all appear together
- On mobile, skip `AnimatePresence` crossfade for image cycling — use instant swap (no `motion.img` wrapper, just regular `img`) to reduce GPU compositing

#### 4. Fix Skeleton CLS Mismatch
**File:** `src/components/shared/loading-states.tsx`

- Change `ProductCardSkeleton` from `aspect-square` to `aspect-[4/5]` to match actual `ProductCard` image ratio

#### 5. Reduce Page Transition Delay
**File:** `src/index.css`

- Reduce `pageEnter` animation from `0.4s` to `0.25s` for snappier route changes
- On mobile, disable the `pageEnter` animation entirely to feel instant

#### 6. Memoize SmartHomeSections
**File:** `src/components/smart/SmartHomeSections.tsx`

- Wrap component export in `React.memo` to prevent re-renders when parent (Index) re-renders from unrelated state changes

#### 7. Global Mobile CSS Polish
**File:** `src/index.css`

- Add mobile rule to disable `hover:-translate-y-2` on all elements (catch-all for inline Tailwind hover transforms): `@media (max-width: 767px) { * { --tw-translate-y: 0 !important; } }` — too broad. Instead, add `.hover\:-translate-y-2:hover { transform: none; }` inside the existing mobile media query
- Add `will-change: auto` reset on mobile to prevent unnecessary GPU layer promotion

### Files Summary

| File | Changes |
|------|---------|
| `src/App.tsx` | Lazy load ChatWidget, PromotionPopup, GiftClaimPopup |
| `src/components/social/HomeSocialProof.tsx` | 2-col mobile grid, remove hover lifts, tighter spacing |
| `src/components/ProductCard.tsx` | Cap entrance delay, simplify mobile image swap |
| `src/components/shared/loading-states.tsx` | Fix skeleton aspect ratio to match cards |
| `src/index.css` | Faster page transition, mobile hover transform override |
| `src/components/smart/SmartHomeSections.tsx` | React.memo wrapper |

### Technical Notes
- No database changes
- No new dependencies
- All changes are CSS/component-level optimizations
- Desktop behavior unchanged

