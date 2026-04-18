

## Investigation needed

Read these files to map AI data flow before fixing:
- `supabase/functions/chat/index.ts` — main AI chat handler, what context it consumes
- `supabase/functions/chat-context/index.ts` — already viewed; uses `products.is_active`, `products.category` (need verify schema), `loyalty_points`, `orders`, `product_views`
- `src/lib/ai-engine.ts` — local content generation engine (templates) — verify if any hardcoded copy leaks
- `src/hooks/useChatContext.ts` — already viewed; hardcodes `FREE_SHIPPING_THRESHOLD = 500`, parses `choices.lastSize` as "categories" (mismatch)
- `src/lib/personalization.ts` — verify it reads live catalog signals
- `src/components/gift-finder/GiftFinderSection.tsx` — AI-ranked gift finder, check data source
- `src/hooks/use-personalized-recommendations.ts` — verify uses live catalog only

## Anticipated root causes (high confidence)

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | `useChatContext` hardcodes `FREE_SHIPPING_THRESHOLD = 500` — Admin-managed shipping config in `currency_config` / `site_settings` is the real source. AI tells users wrong threshold. | `src/hooks/useChatContext.ts` | Read live free-shipping threshold from `usePublishedSetting("shipping_settings")` or shipping config; fall back to `null` (omit) if not configured rather than lying. |
| 2 | `useChatContext` maps `choices.lastSize` → `preferences.categories` — semantic mismatch. Sends wrong personalization signal to AI. | `src/hooks/useChatContext.ts` | Drop the misnamed mapping; use `topCategories` from behavior profile only. |
| 3 | `chat-context` edge function selects `products.category` (string) and `products.image_url` — verify these columns still exist on `products` table or if it should be `category_id` + join `categories`. | `supabase/functions/chat-context/index.ts` | Confirm via DB schema; if drift, switch to `category:categories(name, slug)` join. |
| 4 | `chat-context` returns 4 newest products as `recommended_products` regardless of personalization — AI gets generic "newest" instead of real personalized signal. | `supabase/functions/chat-context/index.ts` | Either remove the field (let chat use behavior signals) or rank by `featured` / `is_active` + recent views overlap. Safer: remove and rely on personalization engine on client. |
| 5 | `chat-context` sums ALL `loyalty_points` rows for user → may double-count if rows represent transactions not balance. Need to confirm vs Admin source-of-truth (likely `points` is delta per row, sum = balance — but should match `useLoyaltyProgress` calc). | `supabase/functions/chat-context/index.ts` | Align with `useLoyaltyProgress` aggregation logic (already sums `points` field — likely OK, just verify). |
| 6 | `chat-context` doesn't gracefully degrade — if any of the 5 parallel queries throws, whole context fails. | `supabase/functions/chat-context/index.ts` | Use `Promise.allSettled` and per-source try/catch so one missing piece doesn't kill the AI context. |
| 7 | `useChatContext` doesn't refresh on cart/auth changes via React Query — uses raw `useState` + `useEffect` with stale closure risk. | `src/hooks/useChatContext.ts` | Convert to `useQuery` with proper key including user id + cart hash; 30s stale + focus refetch (project standard). |
| 8 | `chat` edge function may inject hardcoded fallback copy when context is empty — verify and remove. | `supabase/functions/chat/index.ts` | Replace any hardcoded product/reward strings with "no data available" guards. |
| 9 | `personalization.ts` / `use-personalized-recommendations.ts` — verify they use the live `catalog` prop only (not stale localStorage cached products). | those files | Confirm read-only audit. |

## Files to update (estimate)

1. **`src/hooks/useChatContext.ts`** — convert to `useQuery`, drop hardcoded `FREE_SHIPPING_THRESHOLD`, drop misnamed `lastSize→categories` mapping, pull threshold from published settings (or omit).
2. **`supabase/functions/chat-context/index.ts`** — `Promise.allSettled` per-source resilience, fix `category` field to use join if drifted, drop generic "newest 4" recommendations or rank meaningfully.
3. **`supabase/functions/chat/index.ts`** — audit & remove any hardcoded product/threshold/reward fallback strings; rely on live context only.
4. **`src/lib/ai-engine.ts`** — light audit; ensure template generation doesn't inject fake product names.
5. **(audit-only)** `src/hooks/use-personalized-recommendations.ts`, `src/components/gift-finder/GiftFinderSection.tsx` — confirm live catalog usage.

## Approach

- All AI context fields come from real DB queries. Missing → omit, never invent.
- Use `Promise.allSettled` so partial backend availability still serves a useful (smaller) AI context instead of failing entirely.
- Standardize hook to React Query (30s stale + focus refetch) matching prior phases.
- No new mock data, no new schema, no business logic changes.

## Risk
Low. All changes remove invented values, add resilience, and align with already-published Admin contract.

