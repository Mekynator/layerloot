

## Contract Mismatches Found

| # | Area | Mismatch | Impact |
|---|---|---|---|
| 1 | **Theme** | Storefront reads `site_settings.key='global_design_system'` (doesn't exist). Admin actually publishes to `key='theme'` with fields like `primary`, `accent`, `background`, `card`, `border`, `foreground`, `background_image_url`, `overlay_tint`, `pattern_opacity`, etc. | Theme changes from Admin **never apply** |
| 2 | **Loyalty tiers** | `use-loyalty-progress.ts` has hardcoded `FALLBACK_TIERS` that *exactly* mirror the real `vouchers` table — confusing and risks divergence; voucher catalog already loads from DB via `useAccountOverview` | Stale "rewards" if vouchers query fails silently; obscures real Admin content |
| 3 | **Rewards Store config** | `site_settings.rewards_store_config` (title, subtitle, columns, ctaText, emptyStateText, hoverAnimation) exists but is **never read** by storefront | Admin-edited rewards copy ignored |
| 4 | **Campaign banner** | Working correctly per prior phase, but `theme_overrides`, `effects`, `chat_overrides` are direct hex strings — already handled defensively. No new mismatch. | OK |
| 5 | **Site blocks** | `usePageBlocks` shape OK; matches real rows | OK |
| 6 | **Vouchers** | Already aligned (id, name, points_cost, discount_type, discount_value, is_active) | OK |

## Proposed Changes (4 files)

### 1. `src/contexts/DesignSystemContext.tsx`
- Read from **`site_settings.key='theme'`** (the real Admin payload), not the non-existent `global_design_system` key.
- Pass raw theme JSON through `normalizeGlobalDesignSystem()` — the existing normalizer is already defensive (uses `asString`/`asNumber` fallbacks), so unknown fields are safely ignored.
- Add a `diag()` log when the row is missing so the gap is visible in dev.
- Keep `saveTokens`/`resetTokens` writing to `theme` for symmetry (admin tooling not present here, but keep contract aligned).

### 2. `src/lib/design-system.ts` — `normalizeGlobalDesignSystem`
- Extend the normalizer to map Admin's flat field names (`primary`, `accent`, `background`, `card`, `border`, `foreground`, `secondary`, `muted`, `card_foreground`) into the `GlobalDesignSystem` shape so colors actually apply when published.
- No new fields invented; only mapping real Admin keys → existing token slots.

### 3. `src/hooks/use-loyalty-progress.ts`
- Remove `FALLBACK_TIERS` constant entirely.
- Return empty tier list when `vouchers` is empty so UI shows the proper empty state instead of fake hardcoded tiers.
- Add `diag('loyalty', 'no vouchers loaded')` dev signal.

### 4. `src/components/account/RewardsModule.tsx` + new `src/hooks/use-rewards-store-config.ts`
- New small hook `useRewardsStoreConfig()` that reads `site_settings.rewards_store_config` via existing `usePublishedSetting`.
- `RewardsModule` consumes title/subtitle/ctaText/emptyStateText/columns from this config (with safe fallbacks to the existing translated strings).

## Diagnostic Improvements
- All four files use the existing `diag()` helper from `@/lib/storefront-diagnostics` for dev-only visibility into missing/invalid payloads.

## Files Touched
1. `src/contexts/DesignSystemContext.tsx` — switch key + log
2. `src/lib/design-system.ts` — extend normalizer to map flat Admin fields
3. `src/hooks/use-loyalty-progress.ts` — drop fallback tiers
4. `src/hooks/use-rewards-store-config.ts` (NEW) — published config hook
5. `src/components/account/RewardsModule.tsx` — consume rewards store config

## Not Touched (already aligned)
- `useActiveCampaign` (phase already hardened)
- `usePageBlocks`, `useStorefrontCatalog`, `usePublishedSetting`
- `CampaignThemeProvider` defensive guards
- Vouchers/user_vouchers reads in `useAccountOverview`

## Risk
Low. Single key rename for theme, additive normalizer mapping, removal of one hardcoded constant, one new read-only hook.

