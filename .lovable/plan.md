

# Redesign Gift Finder Results — Smart AI-Powered Results Section

## Current State
The results are rendered inline at the bottom of `GiftFinderSection.tsx` (lines 271–325) as a simple grid of product links with match score badges. No AI messaging, no filtering, no badges, no add-to-cart, no recommendations. The existing `ProductCard` component already has add-to-cart, hover effects, rating stars, and sale badges.

## Scope for This Phase
Given the scale of the request, this plan focuses on the **highest-impact deliverables** that can be built now using existing data. Admin-configurable ranking weights, analytics tracking, and bundle logic are deferred to future phases.

## Plan

### 1. Create `src/components/gift-finder/GiftFinderResults.tsx`
A new component that replaces the inline results section in `GiftFinderSection.tsx`. Receives `selectedTagIds`, `selectedTagNames`, matched `products`, and `loading` as props.

**Sections rendered:**

**A. Sticky Selection Summary Bar**
- Horizontal bar showing selected tag names as chips
- "Edit Selection" button (scrolls back to grid) + "Clear All"
- Sticky on scroll (`sticky top-16 z-30`)

**B. AI Header**
- Dynamic text: "We found X perfect matches based on your preferences"
- Contextual subtitle generated from tag names: "These are perfect for a **Gamer** who loves **Fantasy** themes"
- Sparkles icon, subtle fade-in animation

**C. Smart Badges on Products**
- "Best Match" badge on products matching ALL selected tags (`matchScore === selectedTagIds.length`)
- "Top Pick" badge on featured products
- Products already sorted by matchScore → featured → name (existing logic)

**D. Enhanced Product Cards**
- Reuse the existing `ProductCard` component (already has add-to-cart, hover, ratings, sale badges)
- Wrap each card with an additional overlay showing:
  - Match explanation text: "Matches your Fantasy + Gamer selection"
  - "Best Match" / "Top Pick" badge at top
- Grid: 2 cols mobile, 3 tablet, 4 desktop

**E. Empty State**
- Friendly illustration with "No exact matches" message
- "Browse all products" CTA
- Suggestion to try different vibes

**F. "You Might Also Like" Section**
- Below main results, fetch 4–6 additional products NOT in results but sharing at least 1 tag
- Uses same query pattern but excludes already-shown product IDs
- Simple horizontal scroll or grid

### 2. Update `GiftFinderSection.tsx`
- Extract results rendering (lines 271–325) into the new `GiftFinderResults` component
- Pass tag names (not just IDs) to results for display
- Add `onClear` and `onScrollToSelection` callbacks
- Keep all data fetching in GiftFinderSection (single source of truth)

### 3. Fetch Social Proof for Results
- After products are fetched, query `showcase_reviews` or use the existing `use-social-proof` hook to get rating data for result products
- Pass `socialProof` to ProductCard for star ratings

### Files Changed

| File | Change |
|------|--------|
| `src/components/gift-finder/GiftFinderResults.tsx` | **New** — full results UI with AI header, sticky summary, badges, recommendations |
| `src/components/gift-finder/GiftFinderSection.tsx` | Replace inline results with `<GiftFinderResults />`, pass tag names + callbacks |

### What's Deferred (Future Phases)
- Price range / category / material filters (requires product metadata not currently queried)
- Admin-configurable ranking weights and badge rules
- Bundle suggestions (requires bundle data model)
- Analytics event tracking
- "Why this result?" expandable info
- AI chat integration

