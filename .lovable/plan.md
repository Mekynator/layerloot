

# LayerLoot Public Storefront — Performance Cleanup & Optimization

## Summary

Remove dead code, add lazy loading for all routes, clean up stale imports and unreachable logic. No feature changes — pure weight reduction and speed improvement.

---

## Changes

### 1. Lazy-load all page routes in App.tsx

Currently all 18 page components are eagerly imported. Convert to `React.lazy()` with a `Suspense` fallback. This is the single biggest bundle-size win.

**Before:** 18 static `import` statements
**After:** 18 `React.lazy(() => import(...))` calls wrapped in `<Suspense fallback={<PageSkeleton />}>`

### 2. Remove dead imports and code from Layout.tsx

- **Remove** `FloatingCartSummary` import — it's imported but never rendered (line 50 always evaluates to `null`)
- **Remove** the dead expression `{!isCartPage && !isEditorPreview && null}` on line 50
- **Remove** `isCartPage` variable (no longer used after above)

### 3. Delete unused files — admin-only hooks and utilities

These files exist but are **never imported** by any page or component in the storefront:

**Hooks (admin-only, zero imports in storefront UI):**
- `src/hooks/use-admin-dashboard.ts`
- `src/hooks/use-admin-growth.ts`
- `src/hooks/use-admin-notes.ts`
- `src/hooks/use-admin-permissions.ts`
- `src/hooks/use-experiment-admin.ts`
- `src/hooks/use-analytics-dashboard.ts`
- `src/hooks/use-monthly-declaration.ts`
- `src/hooks/use-monthly-reports.ts`
- `src/hooks/use-recurring-expenses.ts`
- `src/hooks/use-expense-categories.ts`
- `src/hooks/use-custom-order-automation.ts`
- `src/hooks/use-automation-rules.ts`
- `src/hooks/use-translation-manager.ts`
- `src/hooks/use-media-library.ts`
- `src/hooks/use-product-admin.ts`

**Utilities (admin-only, zero imports in storefront UI):**
- `src/lib/generate-declaration-pdf.ts`
- `src/lib/activity-log.ts`

**Editor-only components (never imported from pages):**
- `src/components/shared/AlignmentGuidesOverlay.tsx`
- `src/components/shared/AlignmentToolbar.tsx`
- `src/components/shared/GridOverlay.tsx`
- `src/components/shared/SnappingSettingsPanel.tsx`
- `src/components/shared/DeviceVisibilityControl.tsx`
- `src/components/shared/OverrideSummary.tsx`
- `src/components/shared/ResponsivePropertyControls.tsx`
- `src/components/shared/ResponsiveShortcuts.tsx`
- `src/components/editor/EditorPreviewGuard.tsx`

**Duplicate file:**
- `src/pages/GlobalSectionRenderer.tsx` — duplicate of `src/components/layout/GlobalSectionRenderer.tsx`, never imported anywhere

### 4. Clean up snap/editor utilities (admin-only, zero storefront imports)

- `src/lib/snap-engine.ts`
- `src/hooks/use-snap-settings.ts`
- `src/hooks/use-device-override.ts`

### 5. Create a lightweight PageSkeleton for Suspense fallback

A simple full-width skeleton component for the lazy-load boundary — reuses existing `Skeleton` component.

### 6. Remove dead ChatWidget/PromotionPopup/GiftClaimPopup awareness

These components exist but are **never imported or rendered** in the current app. They are kept as files (may be rendered via dynamic block system), but we confirm no stale imports reference them.

- No action needed — they are already tree-shaken since nothing imports them.

---

## Files changed

| File | Action |
|------|--------|
| `src/App.tsx` | Convert 18 imports to `React.lazy`, add `Suspense` |
| `src/components/layout/Layout.tsx` | Remove `FloatingCartSummary` import, dead line 50, `isCartPage` |
| `src/components/shared/PageSkeleton.tsx` | New — lightweight loading skeleton |
| 28+ admin-only hook/utility/component files | Delete |

## What is NOT touched

- Cart, checkout, product pages, account, AI chat, saved items — all preserved
- `AuthContext.tsx` — kept as-is (internal role checking still needed)
- `admin-permissions-map.ts` — kept (imported by AuthContext)
- `VisualEditorContext.tsx` — kept (imported by BlockRenderer for safe editor detection)
- All storefront-facing components and hooks
- Database integration unchanged

