

# Route Hardening — Public LayerLoot Storefront

## Current State

The storefront is already in strong shape:
- **No admin routes** exist in `App.tsx` — the catch-all `<Route path="*" element={<NotFound />} />` already handles every guessed path
- **No admin navigation/links** remain in the UI (cleaned in the prior pass)
- **No redirect logic** sends users toward admin destinations
- **NotFound page** is clean and customer-facing with no admin wording

## Remaining Items (minor)

### 1. Analytics surface check (`src/lib/analytics.ts` line 162)
`getAnalyticsSurface()` still checks `path.startsWith("/admin")` and returns `"admin"` as a surface type. No admin paths exist in this app, so this branch is dead code. Simplify to always return `"storefront"` (or keep `"editor-preview"` check only). Also clean the `AnalyticsSurface` type to remove `"admin"`.

### 2. Console log in NotFound leaks attempted path
Line 13: `console.error("404 Error: User attempted to access non-existent route:", location.pathname)` — this is fine for debugging but logs the exact path attempted. Change to a generic message that doesn't echo back the path to avoid path-probing information in console.

### 3. `admin-permissions-map.ts` — keep but confirm isolation
This file is imported only by `AuthContext.tsx` for internal role-checking. It never surfaces in UI or routes. No changes needed — just confirmation it stays isolated.

## What does NOT need changing
- `CustomOrdersModule.tsx` — `sender_role === "admin"` is correct customer-facing chat styling (shows "Team" label)
- `use-showcases.ts` — `approved_by_admin` is a database column name, not UI text
- `use-published-settings.ts` — comment-only reference
- `MegaMenuDropdown.tsx` — comment "admin-selected" is code documentation
- `ChatWidget.tsx` — `chatSettings.quickReplies` labeled "adminReplies" in variable name only
- `AuthContext.tsx` — `isAdmin`/`adminRole` kept for internal data-gating, never surfaced in UI

## Files changed

| File | Action |
|------|--------|
| `src/lib/analytics.ts` | Remove `"admin"` from `AnalyticsSurface` type; simplify `getAnalyticsSurface` to remove `/admin` path check |
| `src/pages/NotFound.tsx` | Change console.error to generic message without echoing the attempted path |

## Impact
Two small edits. Everything else is already clean. After this, the storefront has zero admin path awareness at both the UI and code level.

