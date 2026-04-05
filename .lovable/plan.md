

## Fix Page Editor to Show Full Homepage

### Root Cause

The Page Editor only shows CMS blocks from `site_blocks` table. The homepage (`Index.tsx`) renders additional hardcoded React sections **after** the CMS blocks: `SmartHomeSections` (personalized product recommendations) and `HomeSocialProof` (social proof badges). These are invisible to the editor because they aren't registered as static sections.

The `static-page-sections.ts` file defines `home: []` — an empty array — so no static sections appear for the home page.

### Fix Strategy

Register the homepage's hardcoded sections as static sections so they appear in the editor as locked/reorderable items, matching the pattern already used for Products, Cart, Contact, etc.

### Changes

#### 1. Register Home Static Sections (`src/lib/static-page-sections.ts`)

Change `home: []` to include:

- **Smart Recommendations** — "Personalized product recommendations based on user activity"
- **Social Proof** — "Customer reviews, trust badges, and social proof section"

Add corresponding `previewType` values: `home_smart_sections`, `home_social_proof`.

#### 2. Add Preview Components (`src/components/admin/editor/StaticSectionPreview.tsx`)

Add two new preview cases:

- `home_smart_sections` — renders a simple product grid placeholder with "Recommended for You" heading
- `home_social_proof` — renders placeholder review cards and trust badges

These are read-only visual placeholders matching the style of existing previews (like `ProductsGridPreview`).

#### 3. Fix Canvas Container Height (`src/components/admin/editor/EditorCanvas.tsx`)

Change `min-h-[calc(100vh-8rem)]` to `min-h-0` on the canvas wrapper. The current min-height forces a tall empty container even when content is shorter, and doesn't help when content is taller (overflow-y-auto on parent handles scrolling). This ensures the canvas naturally sizes to its content.

#### 4. Ensure `renderBlock` Handles All Block Types

Verify that `BlockRenderer.tsx` doesn't silently return `null` for any block type that exists in the DB. If a block type has no renderer, show a labeled placeholder instead of nothing. (Quick check of current code shows it already has a fallback — just need to confirm it renders visible content.)

### What This Achieves

- Home page in editor shows **all sections** from top to bottom: Hero → Best Sellers → Smart Recommendations → Social Proof
- All sections are visible in the Layers panel with proper labels
- Static sections are locked but reorderable (matching existing pattern)
- Preview stays non-interactive
- No changes to the live page rendering

### Files to Edit

| File | Change |
|------|--------|
| `src/lib/static-page-sections.ts` | Add home static sections |
| `src/components/admin/editor/StaticSectionPreview.tsx` | Add 2 preview components |
| `src/components/admin/editor/EditorCanvas.tsx` | Fix min-height |

