

# AI Personalization Engine

## Current State
- **Behavior tracking** exists in `use-behavior-tracking.ts` — tracks views, cart adds, searches, tool usage in localStorage
- **Smart recommendations** exist in `use-smart-recommendations.ts` — generates sections based on category views and social proof
- **Saved preferences** exist in `SavedPreferencesModule.tsx` + `use-remembered-choices.ts` — materials, colors, finishes, categories, price range stored in localStorage
- **Product options** aggregated dynamically from DB in `use-product-options.ts`
- **Cart upsells** exist but use simple featured/price logic, no personalization
- **Gift finder** has tag-based filtering, no preference pre-selection
- **Mega menu** shows categories/featured products, no personalization
- **AI chat** has context via `useChatContext` hook but no preference/behavior data

What's **missing**: a unified scoring system that combines preferences + behavior into a single ranking function usable across all touchpoints. Currently each component does its own ad-hoc logic.

## Plan

### 1. New Hook: `src/hooks/use-personalization-engine.ts`

Central personalization engine that merges all data sources into a unified product scoring function.

**Inputs consumed:**
- `useBehaviorTracking()` → category interest, recency, session count
- `useRememberedChoices()` → explicit preferences (materials, colors, categories, price range)
- Cart items (passed as parameter)

**Outputs:**
- `scoreProduct(product: CatalogProduct): number` — composite score (0–100)
- `rankProducts(products: CatalogProduct[], limit?: number): CatalogProduct[]` — sorted by score
- `getPersonalizedSections(products, socialProofMap): RecommendationSection[]` — replaces current `useSmartRecommendations` logic with preference-aware sections
- `getTopCategories(): string[]` — merged from behavior + preferences
- `getUserSegment(): "new" | "casual" | "engaged" | "loyal"` — based on session count + behavior depth
- `resetPersonalization(): void` — clears behavior + preferences

**Scoring formula:**
- Category match (behavior): +20 (weighted by view count)
- Category match (preference): +15
- Material match (preference): +10
- Color match (preference): +5
- Price in preferred range: +10
- Recency (created in last 30 days): +5
- Social proof (rating ≥ 4.5): +5
- Featured/admin boost: +10
- Already viewed penalty: -5
- Total normalized to 0–100

Cached via `useMemo` with dependency on behavior + choices + products.

### 2. Update `src/hooks/use-smart-recommendations.ts`

Replace the current ad-hoc logic with calls to the personalization engine:
- "Recommended for you" section uses `rankProducts()` filtered to exclude recent views
- "Based on your activity" section uses behavior-only scoring
- "Trending for your interests" section combines social proof + preference match
- Keep "New arrivals" and "Budget picks" as-is but apply preference filtering

### 3. Update `src/components/smart/SmartHomeSections.tsx`

- Use `usePersonalizationEngine` instead of separate `useBehaviorTracking` + `useSmartRecommendations`
- Add user segment-aware greeting: "Welcome back" for returning, nothing for new
- Show personalized category chips above recommendations (top 3-4 categories from engine)

### 4. Update `src/components/smart/CartUpsellSection.tsx`

- Import `usePersonalizationEngine` and use `rankProducts()` to score upsell candidates instead of simple `is_featured` filter
- Keep free-shipping-gap logic but rank gap-fillers by personalization score

### 5. Update `src/components/gift-finder/GiftFinderSection.tsx`

- Pre-select tags based on saved preferences (`lastGiftSettings.recipientInterests`) and behavior (top categories mapped to gift tags)
- Sort results by personalization score when no explicit tag selection

### 6. Update `src/components/layout/MegaMenuDropdown.tsx`

- Use `getTopCategories()` from engine to reorder the category list — user's preferred categories appear first with a subtle indicator
- No visual change to layout, just order priority

### 7. Update AI Chat Context (`src/hooks/useChatContext.ts`)

- Include user preferences (materials, colors, categories) and top behavior signals in the context sent to the chat edge function
- Add `preferences` and `interests` fields to the context object

### 8. Admin Controls — `src/pages/admin/AdminSettings.tsx`

Add a "Personalization" section in admin settings (stored in `site_settings`):
- Weight sliders: behavior weight, preference weight, popularity weight, recency weight (all default 1.0)
- Admin boost product IDs (comma-separated)
- Toggle: enable/disable personalization globally

No new DB tables needed — weights stored in `site_settings` JSONB, fetched via existing `useStorefrontSettings`.

### 9. Privacy Controls in `SavedPreferencesModule.tsx`

- Add "Reset All Personalization" button that calls `resetPersonalization()` from engine (clears both behavior localStorage + preferences)
- Already has "Reset All" for preferences — extend to also clear behavior data

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/use-personalization-engine.ts` | **New** — unified scoring + ranking engine |
| `src/hooks/use-smart-recommendations.ts` | Refactor to use personalization engine |
| `src/components/smart/SmartHomeSections.tsx` | Use engine, add category chips, segment greeting |
| `src/components/smart/CartUpsellSection.tsx` | Rank upsells by personalization score |
| `src/components/gift-finder/GiftFinderSection.tsx` | Pre-select tags, rank by score |
| `src/components/layout/MegaMenuDropdown.tsx` | Reorder categories by user interest |
| `src/hooks/useChatContext.ts` | Include preferences + behavior in chat context |
| `src/components/account/SavedPreferencesModule.tsx` | Add full personalization reset |
| `src/pages/admin/AdminSettings.tsx` | Add personalization weight controls |

### No Database Changes
Everything runs client-side using existing localStorage data + existing product queries. Admin weights stored in `site_settings` (already exists).

