

## Investigation findings

Building on the prior 5 phases, the remaining stale-data risks live in **per-feature hooks** that don't share the global `QueryClient` defaults or aren't tied into the realtime invalidation channel.

### Stale sources still present

| # | Issue | File | Symptom |
|---|---|---|---|
| 1 | `useNavLinks` / `useStaticSectionSettings` likely have long staleTime + no realtime invalidation. After Admin publishes nav/section changes, header/footer stays old until full reload. | `src/hooks/use-nav-links.ts`, `src/hooks/use-static-section-settings.ts` | Stale header/footer |
| 2 | `useChatSettings`, `useRewardsStoreConfig`, `useLoyaltyProgress` use `usePublishedSetting` (already fixed in last phase to 30s + focus) — OK, but realtime channel doesn't invalidate `["published-setting"]` for the *specific* keys → relies on poll. | `use-storefront-realtime.ts` | Up to 30s stale on chat/rewards copy |
| 3 | `useShowcases`, `useRecentlyViewed`, `useSavedItemsCount` use `useState` + one-time `useEffect` fetch → never refresh after Admin moderates a showcase or user activity changes. | hook files | Stale community content |
| 4 | `CampaignThemeProvider` applies `theme_overrides` to `<html>` CSS vars but doesn't *clear* them when campaign ends/changes → old campaign colors leak after switch. | `src/components/campaign/CampaignThemeProvider.tsx` | Sticky campaign theme |
| 5 | Loading transitions: hooks render `null` while refetching → sections briefly disappear on focus refetch. Should keep `previousData` (React Query `placeholderData: keepPreviousData`). | multiple query hooks | Flicker on focus |
| 6 | Realtime channel only invalidates 5 tables. `vouchers`, `user_vouchers`, `loyalty_points`, `discount_codes`, `categories` not subscribed → reward/discount publishes need poll. | `src/hooks/use-storefront-realtime.ts` | Slow reward/voucher updates |

### Files to update

| File | Change |
|---|---|
| `src/hooks/use-storefront-realtime.ts` | Add subscriptions for `vouchers`, `user_vouchers`, `loyalty_points`, `discount_codes`, `categories`, `reusable_blocks`. Invalidate matching query keys. |
| `src/hooks/use-nav-links.ts` | Convert to `useQuery` if not already; 30s staleTime + focus refetch. |
| `src/hooks/use-static-section-settings.ts` | Same: 30s staleTime + focus refetch. |
| `src/components/campaign/CampaignThemeProvider.tsx` | On campaign change/unmount, **clear** previously-set CSS vars instead of leaving stale values on `<html>`. |
| `src/hooks/use-storefront.ts` (light) | Add `placeholderData: keepPreviousData` to catalog/product queries to prevent flicker. |
| `src/hooks/use-page-blocks.ts` (light) | Same `keepPreviousData` for smoother focus refetch. |
| `src/hooks/use-showcases.ts` | Convert `useState`+`useEffect` fetch to `useQuery` with 30s stale + focus refetch (read-only audit; only convert if currently stateful). |

### Approach

1. **Realtime**: extend the single subscription to cover the 6 additional content tables. One channel, multiple `.on()` filters — minimal overhead.
2. **CampaignThemeProvider cleanup**: track which CSS vars were set, return cleanup that removes them so theme reverts cleanly when campaign deactivates.
3. **`keepPreviousData`**: prevents UI flicker — the old block keeps rendering while the refetch resolves, then swaps in.
4. **Hook normalization**: any remaining `useState`+`useEffect` fetch in published-data hooks → `useQuery` with project-standard 30s/focus config.

### Not changed
- `usePublishedSetting`, `useActiveCampaign`, `useStorefrontCatalog`, `useProductDetailQuery` (already aligned)
- QueryClient defaults (already 30s + focus)
- BlockRenderer (already has `diag()` + per-block error isolation)
- Auth/cart/checkout (out of scope)

### Risk
Low. All changes are additive cache hints, additional realtime subscriptions, and a CSS cleanup return. No schema, no business logic, no mock data.

