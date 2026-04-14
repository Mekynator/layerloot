
# Conversion Optimization & UX Polish — Public LayerLoot Storefront

## Assessment

The storefront is already well-built with solid product cards, cart, checkout, sticky add-to-cart, and trust signals. This plan targets the highest-impact, lowest-risk improvements.

---

## Changes

### 1. Product Card — Always-visible Add-to-Cart on mobile

**Problem:** On mobile, the add-to-cart button opacity is tied to hover state. While it animates in via `isMobile || isHovered`, the button should always be fully visible on mobile — no animation delay.

**Fix in `src/components/ProductCard.tsx`:**
- Make the add-to-cart button always `opacity: 1` on mobile (remove the motion animation wrapper on mobile — render the button directly)
- Increase mobile touch target to `min-h-[44px]` (currently `min-h-[40px]`)

### 2. Product Card — Mobile tap behavior fix

**Problem:** On mobile with multi-image products, the first tap activates image controls instead of navigating to product. This adds friction — users expect to tap and go to the product.

**Fix:** Remove the `handleImageAreaClick` mobile-first-tap-to-activate pattern. On mobile, image arrows should always be visible when there are multiple images (no activation gate). This removes one unnecessary tap from the flow.

### 3. Product Detail — Sticky Add-to-Cart on desktop too

**Problem:** `StickyAddToCart` is `md:hidden` — only shows on mobile. Desktop users scrolling past the add-to-cart area lose the CTA.

**Fix in `src/components/product/StickyAddToCart.tsx`:**
- Show on all viewports (remove `md:hidden`)
- On desktop, render a more compact bar (product name + price + button in a centered container)

### 4. Cart Page — Trust signals position

**Problem:** Trust signals (secure checkout, fast production, carefully packed) are buried below the checkout button. They should appear *above* the checkout CTA to build confidence before the action.

**Fix in `src/pages/Cart.tsx`:**
- Move the trust signals `div` (ShieldCheck, Truck, Package) to render above the checkout button instead of below

### 5. Cart Page — Continue Shopping link position

**Problem:** "Continue Shopping" link is at the very bottom of the sidebar, easy to miss. 

**Fix:** Add a secondary "Continue Shopping" button/link near the top of the cart items column (under the free shipping bar) for easy access.

### 6. Product Detail — "Added to cart" toast + visual confirmation

**Problem:** Currently shows a toast AND a floating pill — slightly redundant. The floating pill is better for flow.

**Fix in `src/pages/ProductDetail.tsx`:**
- Remove the `toast()` call in `handleAddToCart` (the animated pill + button state change + cart badge pulse already provide sufficient feedback)
- This reduces visual noise and keeps the user focused

### 7. Product Card — Discount savings amount

**Problem:** Sale badge shows `-X%` but doesn't show the actual amount saved, which is a stronger conversion signal.

**Fix in `src/components/ProductCard.tsx`:**
- Add a small "Save X kr" text next to the strikethrough price for products with `compare_at_price`

### 8. Mobile — Sticky Add-to-Cart safe area padding

**Already implemented** with `env(safe-area-inset-bottom)` — confirmed good.

---

## Files changed

| File | Change |
|------|--------|
| `src/components/ProductCard.tsx` | Always-visible CTA on mobile, remove first-tap-gate, add savings amount |
| `src/components/product/StickyAddToCart.tsx` | Show on desktop too with compact layout |
| `src/pages/Cart.tsx` | Move trust signals above checkout CTA, add continue-shopping link near top |
| `src/pages/ProductDetail.tsx` | Remove redundant toast on add-to-cart |

## What is NOT touched
- Cart checkout flow (Stripe integration intact)
- AI chat (already conversion-focused per memory)
- Homepage (driven by DynamicPage + published blocks — no hardcoded changes needed)
- Database queries
- Auth flows
- Saved items

## Risk
All changes are cosmetic/UX-only. No logic changes to checkout, cart state, or data fetching.
