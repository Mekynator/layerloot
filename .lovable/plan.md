

I need to inspect current customer-facing reward/voucher/loyalty/discount surfaces before producing a precise fix list.

Files to inspect:
- `src/components/account/RewardsModule.tsx` — current rewards store rendering
- `src/components/account/VouchersModule.tsx` — voucher list display
- `src/components/cart/CheckoutSavingsPanel.tsx` — discount/voucher/gift-card application
- `src/hooks/useCheckoutSavings.ts` — eligibility logic
- `src/hooks/use-cart-account-data.ts` — already partially audited; verify gift card balance display
- `src/components/social/LoyaltyProgressCard.tsx` — milestone tier display
- `src/lib/savedItems.ts` / discount validate edge function references

Anticipated findings (from prior 6 phases + visible code in context):

| # | Likely root cause | File | Fix |
|---|---|---|---|
| 1 | `useLoyaltyProgress` only counts redeemable rewards from `<= balance`, but `progressPercent` uses `redeemableRewards.length` index — when balance is 0 and no tiers redeemed yet, `prevThreshold = 0` is correct but message shows "Earn points..." even when tiers exist. Need empty-tier guard so card hides cleanly. | `use-loyalty-progress.ts` | Already mostly OK; verify empty-tier path returns sensible defaults. |
| 2 | `CartDiscountCode` in `use-cart-account-data.ts` has hardcoded `"5.99"` for free shipping value and `"kr"` literal in labels — should pull from real shipping config + use `formatPrice()`. | `use-cart-account-data.ts` | Replace hardcoded `5.99` with shipping config lookup or 0 (display "Free delivery"); use `formatPrice()` for currency. |
| 3 | Voucher display still shows raw `kr` strings — bypasses `formatPrice` localization. | `use-cart-account-data.ts` | Use `formatPrice()` consistently. |
| 4 | `CheckoutSavingsPanel` may not show expiry / per-user-limit / min-order-amount eligibility hints — users see voucher then get rejected at apply. | `CheckoutSavingsPanel.tsx`, `useCheckoutSavings.ts` | Surface `expires_at`, `min_order_amount`, `per_user_limit` checks client-side as warning labels. |
| 5 | `RewardsModule` empty state when `vouchers` table is empty — verify it shows the configured `emptyStateText` instead of nothing. | `RewardsModule.tsx` | Confirm/fix empty state. |
| 6 | Gift card partial-balance display: `row.balance` is the remaining; users need to see "X of Y remaining". | `use-cart-account-data.ts` | Show balance + total when different. |
| 7 | Discount code expiry/active-state filtering: storefront should hide expired/inactive discount codes from any user-facing list (currently codes are admin-only RLS so this only affects auto-applied flows). | verify | RLS already restricts; OK. |

## Files to update (final estimate)

1. `src/hooks/use-cart-account-data.ts`
   - Replace hardcoded `5.99` shipping value with `0` and rely on free-shipping flag
   - Use `formatPrice()` from `@/lib/currency` for all displayed amounts
   - For gift cards, show `formatPrice(balance)` and original total when partially used
   - Filter out expired vouchers (where `vouchers.expires_at < now()` if present in row)

2. `src/hooks/use-loyalty-progress.ts`
   - When `allTiers` is empty, return `progressPercent: 0`, `message: ""`, and `canRedeem: false` so `LoyaltyProgressCard` empty-state is clean
   - Already mostly aligned; minor guard

3. `src/components/social/LoyaltyProgressCard.tsx`
   - Return `null` early when `allTiers.length === 0` AND `balance === 0` so card doesn't render an empty progress bar
   - Already returns null in compact when balance is 0; extend to full variant

4. `src/components/account/VouchersModule.tsx`
   - Audit: ensure expiry, used state, gift status are surfaced from real `user_vouchers` row (no hardcoded fallbacks)
   - Use `formatPrice()` for all monetary display

5. `src/components/cart/CheckoutSavingsPanel.tsx` + `src/hooks/useCheckoutSavings.ts`
   - Add client-side eligibility hints for `min_order_amount` (show "Add X more to unlock") and `expires_at` (show "Expires in N days")
   - Disable apply button when client-side eligibility fails with clear reason
   - Defensive: if `useCartAccountData` returns empty list, show "No rewards available yet" message

6. `src/components/account/RewardsModule.tsx`
   - Ensure empty state uses `rewardsConfig.emptyStateText` (already wired in last phase — verify)
   - Show real `voucher.discount_value` formatted via `formatPrice()` rather than raw concatenation

## Approach

- **No new mock data** — all values pulled from `vouchers`, `user_vouchers`, `loyalty_points`, `discount_codes` tables.
- **Use `formatPrice()` everywhere** — replace `${value} kr` literal strings.
- **Surface eligibility client-side** — compute `min_order_amount`, `expires_at`, `per_user_limit` constraints at render time so users see *why* something can't be applied.
- **Defensive empty states** — every customer-facing card returns clean empty state when backend data is missing instead of broken UI.

## Not touched
- Discount code validation server logic (`validate-discount-eligibility` edge function) — already source-of-truth
- RLS policies on `vouchers`/`user_vouchers`/`discount_codes`/`loyalty_points` — already correct
- Admin editing tools — out of scope per rules
- `useAccountOverview` — already aligned with backend schema

## Risk
Low. All changes are display-layer formatting, defensive guards, and surfacing existing backend fields in the UI. No schema changes, no new business logic, no mock data.

