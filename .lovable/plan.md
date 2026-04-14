

# Remove Admin Traces from Public LayerLoot Storefront

## Findings

Admin exposure points found in the public storefront:

1. **Account page** (`src/pages/Account.tsx` line 154-158) — Admin button with Shield icon and `/admin` link, gated by `isAdmin`
2. **Header settings types** (`src/components/layout/Header.tsx`) — `show_admin_icon`, `admin_label`, `mobile_admin_label` fields and defaults like "Admin Dashboard"
3. **Layout.tsx** (line 15, 23-25) — `isAdminRoute` check with `/admin` path handling
4. **ProductDetail.tsx** (line 71) and **Policies.tsx** (line 35) — `window.location.pathname.startsWith("/admin/visual-editor")` checks
5. **AuthContext.tsx** — exposes `isAdmin` and `adminRole` (needed internally but should not drive UI)
6. **Header mobile nav** (line 425) — comment mentioning "admin access is via /admin/login"

No admin page files exist in `src/pages/admin/` — those were already removed. The `ADMIN_ROLE_SET` import in AuthContext is fine to keep for internal role-checking logic.

## Changes

### 1. `src/pages/Account.tsx`
- Remove the `Shield` import
- Remove `isAdmin` from `useAuth()` destructuring
- Remove the entire admin button block (lines 154-158): the `{isAdmin && <Link to="/admin">...}` section

### 2. `src/components/layout/Header.tsx`
- Remove `show_admin_icon`, `admin_label`, `mobile_admin_label` from `HeaderSettings` type
- Remove their defaults from `defaultHeaderSettings`
- Remove the comment on line 425 about admin access

### 3. `src/components/layout/Layout.tsx`
- Remove `isAdminRoute` variable and the admin route early-return block (lines 15, 23-25)
- No `/admin` routes exist in this app, so this code path is dead

### 4. `src/pages/ProductDetail.tsx`
- Remove `/admin/visual-editor` and `/admin/editor` path checks from the `isEditorPreview` calculation (two locations: lines 71 and 716)
- Keep the `editorPreview` query param and session flag checks

### 5. `src/pages/Policies.tsx`
- Same fix: remove `/admin/` path checks from `isEditorPreview` calculation

### 6. `src/contexts/AuthContext.tsx`
- Keep `isAdmin` and `adminRole` in context (used internally for data-gating in hooks)
- No UI changes needed here — the exposure was in Account.tsx which is being cleaned

### Not touched
- `src/lib/admin-permissions-map.ts` — internal utility, not rendered in UI
- `src/hooks/use-admin-permissions.ts` — internal hook, not used in storefront UI
- `src/hooks/use-admin-notes.ts` — internal hook
- `Shield` icon usage in Cart, BlockRenderer, QA, etc. — these are customer-facing trust badges, not admin references
- `CustomOrdersModule.tsx` `isAdmin` — this checks `msg.sender_role === "admin"` to style chat bubbles, which is correct customer-facing behavior

