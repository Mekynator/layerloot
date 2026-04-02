

# Checkout, Discount & Rewards System Upgrade

## Current State
- Cart page has inline discount selection via a basic `<select>` dropdown or manual code input
- `use-cart-account-data.ts` fetches vouchers/gift cards from `user_vouchers` table
- `create-checkout` edge function resolves one voucher/gift card and creates a Stripe coupon
- `stripe-webhook` marks vouchers used on payment completion
- No stacking support, no validation feedback, no admin checkout config, no savings recommendations
- `discount_codes` table exists but is separate from the voucher system — not used at checkout
- Gift card partial balance deduction sets balance to 0 (no partial tracking)

## Phase 1 — Core Checkout Savings Panel (this round)

### 1. New `CheckoutSavingsPanel` component
Replace the inline discount area in `Cart.tsx` with a dedicated component containing:
- **Manual code input** with Apply button and validation feedback
- **Available vouchers/rewards** as selectable cards (not a dropdown) showing type icon, value, and impact preview
- **Gift card section** showing balance and partial-apply slider
- **Applied savings summary** with remove buttons and clear breakdown
- **Best savings suggestion** banner ("This voucher saves you more")

### 2. Upgrade `useCartAccountData` hook
- Merge `discount_codes` into the available options (public codes the user can apply by entering them)
- Return typed categories: `vouchers`, `giftCards`, `freeShippingRewards`
- Add validation metadata: min order, expiry, eligibility status, reason if ineligible
- Calculate "best option" recommendation per category

### 3. New `useCheckoutSavings` hook
Central state manager for applied savings:
- Track multiple applied items (respecting stacking rules)
- Validate each against cart state (subtotal, items, categories)
- Compute combined discount amount, shipping discount, gift card deduction
- Return clear line items for summary display
- Stacking rules initially hardcoded: 1 discount/voucher + 1 gift card + free shipping allowed

### 4. Update Cart.tsx order summary
- Replace current discount calculation with `useCheckoutSavings` output
- Show line items: subtotal, shipping, discount (with label), gift card deduction, total
- Animate savings amount with green highlight
- Show "You saved X" badge when savings > 0

### 5. Update `create-checkout` edge function
- Accept array of applied savings (discount code + voucher code + gift card code)
- Validate all server-side
- Calculate combined Stripe discount
- Store all applied items in session metadata
- Support partial gift card deduction (update balance, not mark as used)

### 6. Update `stripe-webhook`
- Handle partial gift card balance updates (deduct amount, keep usable if balance remains)
- Store applied savings details in order metadata
- Support multiple voucher/discount tracking per order

## Phase 2 — Admin Controls & Stacking Engine (follow-up)
- Admin stacking rules configuration (stored in `site_settings`)
- Admin checkout UI customization (titles, colors, labels)
- Discount scheduling and campaign linking
- Analytics dashboard for discount usage

## Phase 3 — Refund Readiness & Advanced Features (follow-up)
- Refund reversal logic (restore vouchers, gift card balance, points)
- Account page savings history
- Advanced validation (product/category exclusions)

---

## Technical Details

### Files to create
| File | Purpose |
|---|---|
| `src/components/cart/CheckoutSavingsPanel.tsx` | Main savings UI with code input, voucher cards, gift card apply, summary |
| `src/hooks/useCheckoutSavings.ts` | State machine for applied savings, validation, stacking, totals |

### Files to modify
| File | Change |
|---|---|
| `src/hooks/use-cart-account-data.ts` | Add discount_codes fetch, categorize by type, add validation metadata |
| `src/pages/Cart.tsx` | Replace inline discount area with `CheckoutSavingsPanel`, use `useCheckoutSavings` for totals |
| `supabase/functions/create-checkout/index.ts` | Accept multiple savings, validate all, partial gift card support |
| `supabase/functions/stripe-webhook/index.ts` | Partial gift card balance update, multi-savings metadata storage |

### Database changes
- Add `discount_metadata` jsonb column to `orders` table to store applied savings details
- No new tables needed — uses existing `discount_codes`, `user_vouchers`, `vouchers`

### Stacking rules (Phase 1 defaults)
- Max 1 discount code OR 1 voucher reward
- Max 1 gift card (partial allowed)
- Free shipping stacks with everything
- Points discount stacks with everything

