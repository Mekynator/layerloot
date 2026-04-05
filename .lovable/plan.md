

## Product Page Mobile Media Optimization

### Changes

#### 1. Create `ProductMediaLightbox` Component (New File)
**File:** `src/components/product/ProductMediaLightbox.tsx`

A fullscreen mobile lightbox/viewer for product images with:
- Fullscreen overlay (`fixed inset-0 z-50 bg-black`)
- Horizontal swipe between images via touch handlers
- Pinch-to-zoom using a `transform: scale()` approach tracking two-finger distance
- Double-tap to toggle 2x zoom
- Zoom resets on image change
- Dot indicators for position
- Close button (X) top-right
- `overflow: hidden` on body when open to prevent background scroll
- Renders only images (videos/3D open in their own viewers)

#### 2. Reduce Mobile Hero Media Height
**File:** `src/pages/ProductDetail.tsx`

Change hero image container from `aspect-square` to `aspect-[4/3] md:aspect-square`. This reduces the hero height on mobile by ~25%, letting title/price/CTA appear sooner without losing visual impact.

#### 3. Wire Tap-to-Open Lightbox
**File:** `src/pages/ProductDetail.tsx`

- Add `lightboxOpen` state and `lightboxStartIndex` state
- On tap of hero image area (not swipe), open `ProductMediaLightbox` with `startIndex={currentImage}`
- Import and render `ProductMediaLightbox` conditionally
- Stop auto-gallery timer when lightbox is open

#### 4. Reduce Thumbnail Hover Motion on Mobile
**File:** `src/pages/ProductDetail.tsx`

The thumbnail buttons use `whileHover={{ y: -2 }}` — already identified in prior pass. Change to `whileHover={undefined}` on mobile by conditionally applying the prop (use `useIsMobile` hook). Same for the 3D button, variant buttons, PrintInfo wrapper, and color picker wrapper — all have `whileHover={{ y: -2 }}` that causes jitter on touch.

#### 5. Mobile Spacing Polish
**File:** `src/pages/ProductDetail.tsx`

- Reduce `space-y-4` on the left column to `space-y-3` on mobile for tighter gallery-to-info flow
- Reduce `gap-6` in grid to `gap-4` on mobile (already `gap-6 lg:gap-8`, change to `gap-4 md:gap-6 lg:gap-8`)

#### 6. ModelViewer Mobile Polish
**File:** `src/components/ModelViewer.tsx`

- Reduce inline `min-h-[320px]` to `min-h-[260px]` on mobile (use responsive class: `min-h-[260px] sm:min-h-[320px]`)
- This is already auto-rotate=false and DPR=[1,1.5] on mobile from prior pass — no further changes needed

#### 7. Video Section Mobile Optimization
**File:** `src/components/product/ProductDetailSections.tsx`

- Change `VideoSection` native video from `autoPlay` to NOT autoplay on mobile — use `preload="metadata"` with controls shown instead. Add a play button overlay or just rely on native controls.
- Change to: remove `autoPlay` and `loop`, add `controls`, keep `muted playsInline preload="metadata"`. This prevents performance drag from auto-playing videos while scrolling.

### Files Summary

| File | Action |
|------|--------|
| `src/components/product/ProductMediaLightbox.tsx` | Create — fullscreen image viewer with swipe + pinch-to-zoom |
| `src/pages/ProductDetail.tsx` | Edit — mobile aspect ratio, lightbox wiring, remove hover lifts, spacing |
| `src/components/ModelViewer.tsx` | Edit — reduce mobile min-height |
| `src/components/product/ProductDetailSections.tsx` | Edit — disable video autoplay |

### Technical Notes
- Pinch-to-zoom uses pointer events / touch distance calculation, no external library
- Lightbox prevents body scroll via `document.body.style.overflow = 'hidden'` on mount
- All changes are mobile-only or mobile-first — desktop behavior unchanged
- No new dependencies required

