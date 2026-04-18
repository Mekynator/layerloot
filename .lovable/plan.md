

## Root Causes Found

| Area | Issue | File |
|---|---|---|
| Campaigns | Query filters `start_date`/`end_date` but Admin writes `starts_at`/`ends_at`. Active "Summer Launch" campaign has `starts_at` set, `start_date=NULL` → hook returns nothing. | `src/hooks/use-active-campaign.ts` |
| Campaigns | Two chained `.or()` calls; PostgREST keeps only the last → schedule filter is broken. | `src/hooks/use-active-campaign.ts` |
| Campaigns | Hook type & provider never expose `banner_title`, `banner_subtitle`, `banner_image_url`, `homepage_placement`, `linked_product_ids`, schedule fields → admin banner content cannot render. | `src/hooks/use-active-campaign.ts`, `src/components/campaign/CampaignThemeProvider.tsx` |
| Loyalty | `REWARD_TIERS` hardcoded in `use-loyalty-progress.ts` masks the real `vouchers` table catalog managed by Admin (e.g. 350-pt Free Gift Wrap, sort_order). | `src/hooks/use-loyalty-progress.ts` |
| Rewards module | Sorts `vouchers` by `sort_order` but `useAccountOverview` already orders by `points_cost` — minor; not blocking. | already correct via overview |
| Theme | No bug in code — `DesignSystemProvider` is mounted. `global_design_system` row simply hasn't been published yet by Admin. Storefront will pick it up automatically once published. | no change |
| Page blocks / vouchers / RLS | All correct, reading published `value` only. | no change |

## Changes

### 1. `src/hooks/use-active-campaign.ts`
- Expand `CampaignTheme` type with: `is_active`, `homepage_placement`, `banner_title`, `banner_subtitle`, `banner_image_url`, `linked_product_ids`, `linked_category_ids`, `linked_discount_id`, `starts_at`, `ends_at`, `priority`.
- Replace broken double-`.or()` query with explicit AND-of-OR using PostgREST grouping:
  ```
  .or(`and(start_date.is.null,starts_at.is.null),start_date.lte.${now},starts_at.lte.${now}`)
  .or(`and(end_date.is.null,ends_at.is.null),end_date.gte.${now},ends_at.gte.${now}`)
  ```
  Use `.filter()` chained correctly OR fetch a small superset and filter in JS for safety. We will fetch by `status='active'` + ordered by priority/recency, then filter window in JS — robust against schema dual-naming.
- Add `console.warn` when no active campaign found in dev (debug signal).

### 2. `src/components/campaign/CampaignThemeProvider.tsx`
- Update `CampaignBanner` to render real Admin-saved fields when present: prefer `banner_title`/`banner_subtitle`/`banner_image_url`, fall back to legacy `banner_config.text`. Honor `homepage_placement` for placement (banner already shows globally — keep, but if both `homepage_placement=true` and `banner_image_url` exist, render richer version).
- Trigger banner if either `banner_config.enabled` OR `banner_title` is present (so Admin's new content shape lights up automatically).

### 3. `src/hooks/use-loyalty-progress.ts`
- Remove hardcoded `REWARD_TIERS`.
- Change `computeLoyaltyProgress` signature to accept the real `vouchers` array (already loaded in `useAccountOverview`) and derive tiers from it (`points_cost`, `name`, `discount_type`, `discount_value`).
- Update `useLoyaltyProgress` to pass `overview.vouchers` into the compute function.
- Update the two callers (`RewardsModule.tsx` line 62, `LoyaltyProgressCard` consumer chain) to pass `overview.vouchers`.

### 4. `src/components/account/RewardsModule.tsx`
- One-line update: pass `vouchers` to `computeLoyaltyProgress(...)`.

## Files Changed (4)
1. `src/hooks/use-active-campaign.ts`
2. `src/components/campaign/CampaignThemeProvider.tsx`
3. `src/hooks/use-loyalty-progress.ts`
4. `src/components/account/RewardsModule.tsx`

## Not Touched (already correct)
- Backend env / Supabase client (verified pointing to shared `rvdafdqibsqvnngbwcnd`)
- `usePublishedSetting` (reads `value` only, never `draft_value`)
- `usePageBlocks` (filters published + `is_active`)
- `DesignSystemProvider` (already mounted in `App.tsx`)
- `VouchersModule`, `useAccountOverview` (already real-data driven)
- RLS policies (already correct on `campaigns`, `vouchers`, `user_vouchers`, `loyalty_points`)

## Risk
Low. Changes are additive type/field expansions and replacement of one hardcoded constant with a real DB read that's already being fetched.

