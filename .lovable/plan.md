

## Investigation summary

From the network logs and code review, the storefront is correctly fetching shared backend data (campaigns, blocks, products), but several reliability gaps exist that cause stale content or silent failures after Admin publishes:

### Root issues found

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | React Query `staleTime: 5min` on `useStorefrontCatalog` and `useProductDetailQuery`; no `refetchOnWindowFocus`. After Admin publishes, storefront keeps showing old products/blocks for up to 5 min. | `src/hooks/use-storefront.ts` | Stale products/blocks |
| 2 | `usePageBlocks` likely has similar staleness; no realtime invalidation. | `src/hooks/use-page-blocks.ts` (need to verify) | Stale blocks |
| 3 | `useActiveCampaign` polls every 60s but uses `useState` (not React Query) → no shared cache, no cross-tab/component sync, no manual invalidation hook. Also fully swallows errors → silent failure. | `src/hooks/use-active-campaign.ts` | Hard to debug; stale campaigns |
| 4 | `CampaignBanner` renders even when content is empty/whitespace; no defensive guards on missing `banner_image_url` (broken `<img>`), no `onError` fallback. | `src/components/campaign/CampaignThemeProvider.tsx` | Broken images, empty bars |
| 5 | No global focus/visibility-based refetch → returning to tab shows old data indefinitely. | React Query default config (likely in `App.tsx` or `main.tsx`) | Stale everything |
| 6 | No realtime subscription on `site_blocks`, `campaigns`, `site_settings` → publishes never push to active sessions. | Cross-cutting | "Why didn't it update?" |
| 7 | Errors in fetches are swallowed (e.g. `catch {}` in campaign hook); no dev-mode visibility. | Multiple hooks | Silent failure |
| 8 | Loyalty/voucher hooks may render nothing when data missing instead of showing empty state. | `use-loyalty-progress.ts`, `RewardsModule.tsx` | Confusing blank UI |

---

## Proposed changes

### 1. `src/main.tsx` (or wherever `QueryClient` is created)
Configure QueryClient with sensible storefront defaults:
- `refetchOnWindowFocus: true`
- `refetchOnReconnect: true`
- `staleTime: 30s` (down from 5min)
- Keep `gcTime` reasonable

### 2. `src/hooks/use-storefront.ts`
- Lower `staleTime` from `5min` → `30s` for `useStorefrontCatalog` and `useProductDetailQuery`.
- Add `refetchOnWindowFocus: true`.

### 3. `src/hooks/use-page-blocks.ts` (verify + adjust)
- Apply same staleTime/refetch policy.

### 4. `src/hooks/use-active-campaign.ts` — REWRITE to React Query
- Replace `useState` + `setInterval` with `useQuery`:
  - `queryKey: ['active-campaign']`
  - `staleTime: 30s`, `refetchInterval: 60s`, `refetchOnWindowFocus: true`
- Surface fetch errors via React Query's `error` (still log warn in dev).
- Add defensive parse: ensure `theme_overrides`, `effects`, `chat_overrides`, `banner_config` always exist as objects (not null) so consumers don't crash.
- Export `refetch` so other components can trigger a manual refresh.

### 5. `src/components/campaign/CampaignThemeProvider.tsx`
- `CampaignBanner`: bail out cleanly if no displayable content (trim + check); add `onError` on `<img>` to hide broken images; wrap render in try/catch in dev mode log.
- `CampaignParticles`: clamp density; guard against invalid `type`.
- Theme variable application: wrap `hexToHslString` calls; if invalid hex returned, skip override (don't poison CSS vars).

### 6. NEW `src/hooks/use-storefront-realtime.ts`
Lightweight hook that subscribes to `postgres_changes` on `site_blocks`, `campaigns`, `site_settings` tables and invalidates the matching React Query keys. Mount once in `App.tsx`.

This makes Admin publishes appear in active storefront sessions within ~1s instead of waiting for poll/window-focus.

### 7. `src/hooks/use-loyalty-progress.ts` & `src/components/account/RewardsModule.tsx`
- Add empty-state handling: if `vouchers` array is empty, render a friendly "No rewards available yet" rather than nothing.
- Defensive null-checks on `points_cost`, `discount_value`.

### 8. NEW `src/lib/storefront-diagnostics.ts`
Tiny dev-only logger:
```ts
export const diag = (area: string, msg: string, data?: unknown) => {
  if (import.meta.env.DEV) console.warn(`[storefront:${area}]`, msg, data ?? '');
};
```
Replace scattered `console.warn` strings with this consistent helper. Production is silent.

### 9. `src/components/blocks/BlockRenderer.tsx` (light touch)
Wrap `renderBlock` in error boundary or try/catch so a single malformed block doesn't crash the whole page; log via `diag('blocks', ...)` and render `null` for the broken one.

---

## Files changed (8)

| File | Change |
|---|---|
| `src/main.tsx` | QueryClient defaults: focus refetch + 30s staleTime |
| `src/hooks/use-storefront.ts` | Lower staleTime, focus refetch |
| `src/hooks/use-page-blocks.ts` | Lower staleTime, focus refetch |
| `src/hooks/use-active-campaign.ts` | Rewrite using React Query + defensive parse |
| `src/components/campaign/CampaignThemeProvider.tsx` | Defensive banner/particles/theme guards |
| `src/hooks/use-storefront-realtime.ts` (NEW) | Realtime invalidation on publish |
| `src/App.tsx` | Mount `useStorefrontRealtime()` |
| `src/lib/storefront-diagnostics.ts` (NEW) | Dev-only `diag()` helper |
| `src/components/blocks/BlockRenderer.tsx` | Per-block error isolation |
| `src/hooks/use-loyalty-progress.ts` + `RewardsModule.tsx` | Empty-state guards |

## Not touched
- Supabase client (already correct)
- `usePublishedSetting` (already published-only)
- Auth, cart, checkout (out of scope)
- Static fallback removal (already done in prior phase)

## Risk
Low. Changes lower cache windows, add realtime + error isolation, and harden defensive parsing. No schema or business-logic changes.

