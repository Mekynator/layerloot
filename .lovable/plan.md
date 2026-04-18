

## Audit Plan: Per-Feature Parity Sweep

I need to read the current state of several key files to verify what's still aligned vs. what drifted after the prior 4 phases. Let me investigate before producing the fix list.

Files to inspect:
- `src/components/blocks/BlockRenderer.tsx` — verify block-type coverage matches Admin-saved shapes
- `src/lib/reusable-blocks.ts` — verify reusable block hydration
- `src/components/layout/Footer.tsx` & `Header.tsx` — check if hardcoded sections override published `footer_settings` / nav
- `src/hooks/use-nav-links.ts` — verify it reads published nav from `site_pages`
- `supabase/functions/chat-context/index.ts` — verify AI context reads live catalog
- `src/lib/personalization.ts` — verify personalization uses live signals, not hardcoded defaults
- DB inspection: confirm published payloads exist for `theme`, `rewards_store_config`, `footer_settings`, `header_settings`, active `campaigns`

After reading I will produce a focused fix plan. Likely findings (based on prior audits):

### Anticipated findings

| Group | Likely issue | File(s) |
|---|---|---|
| **Campaigns** | `homepage_placement` / `homepage_sort_order` / `linked_*` fields fetched but not used to gate where banner/list renders. CTA from `content` JSON not surfaced. | `use-active-campaign.ts`, `CampaignThemeProvider.tsx` |
| **Themes** | Background image URL, overlay tint, pattern opacity from Admin payload not applied (only colors mapped in last phase). | `lib/design-system.ts`, `DesignSystemContext.tsx` |
| **Blocks** | `BlockRenderer` may not handle every Admin block type → silent fallback to nothing. Need to add `diag()` for unknown types so missing renderers are visible. | `BlockRenderer.tsx` |
| **Footer/Header** | Hardcoded footer columns/links overriding `footer_settings` published row. | `Footer.tsx`, `Header.tsx` |
| **Rewards** | `RewardsModule` shows backend rewards but `LoyaltyProgressCard` may still not consume `vouchers`. Discount eligibility not surfaced for guest users on storefront. | `LoyaltyProgressCard`, `useCheckoutSavings` |
| **AI** | `chat-context` edge function may use outdated category/product field names. | `supabase/functions/chat-context/index.ts` |
| **Published reliability** | Some hooks still missing `refetchOnWindowFocus` (e.g. `usePublishedSetting` has 5min staleTime). | `use-published-settings.ts` |

## Plan structure

After reading, I'll output:
1. Concrete root causes per feature group
2. Exact files to update
3. Minimal, typed, contract-aligned fixes
4. No new mock data, no schema changes

## Investigation steps (read-only) before final implementation plan

1. View `src/components/blocks/BlockRenderer.tsx`
2. View `src/components/layout/Footer.tsx` + `src/hooks/use-nav-links.ts`
3. View `supabase/functions/chat-context/index.ts`
4. View `src/lib/design-system.ts` (current state after last phase)
5. View `src/components/social/LoyaltyProgressCard.tsx`
6. View `src/hooks/use-published-settings.ts` cache config
7. DB: list published `site_settings` keys + count active campaigns/blocks

Once those are read I will produce the concrete per-file fix plan in a follow-up plan block. Approving this plan switches me to default mode where I can both inspect and edit; the inspection above will run first, then fixes will be implemented in the same loop.

## Files expected to be touched (estimate, will be confirmed after inspection)

1. `src/hooks/use-active-campaign.ts` — surface `homepage_placement` gating + CTA from content
2. `src/components/campaign/CampaignThemeProvider.tsx` — apply background_image_url / overlay_tint / pattern_opacity from theme
3. `src/lib/design-system.ts` — extend normalizer to map Admin background/overlay/pattern fields
4. `src/components/blocks/BlockRenderer.tsx` — `diag()` warning for unknown block types
5. `src/components/layout/Footer.tsx` — consume `footer_settings` from published settings (remove hardcoded columns if found)
6. `src/hooks/use-published-settings.ts` — lower staleTime to 30s + `refetchOnWindowFocus: true`
7. `supabase/functions/chat-context/index.ts` — verify field names match current `products`/`categories` schema (only if drift found)

## Risk
Low. All changes are additive parsing/rendering corrections matching the real Admin payload contract. No schema changes, no mock data, no new business logic.

