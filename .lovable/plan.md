

# LayerLoot Admin Studio — RBAC & Permissions System

## Current State

- **Database**: Already has 11 roles in `app_role` enum (owner, super_admin, admin, editor, support, content_admin, orders_admin, support_admin, marketing_admin, custom, user)
- **Database**: Already has `admin_permissions`, `admin_invitations`, `user_roles` tables with proper RLS
- **Database**: Already has `has_role()` and `has_permission()` security definer functions
- **Admin Studio code**: Only checks `role === "admin"` — no RBAC, no route guards, no permission hooks
- **Admin Studio types**: `app_role` enum is outdated (only "admin" | "user") — needs regeneration

## Plan

### 1. Create `src/lib/admin-permissions-map.ts`

Port the permission map from the public app with:
- `OWNER_EMAIL` constant
- `AdminRoleKey` type covering all 10 admin roles
- `ADMIN_ROLE_SET` for quick membership checks
- `ALL_PERMISSIONS` array with module-level permissions
- `PERMISSION_GROUPS` for UI display
- `ROLE_LABELS`, `ROLE_COLORS` for admin management UI
- `isOwnerEmail()`, `canManageRole()` helpers

### 2. Create `src/hooks/use-admin-permissions.ts`

Permission hook that:
- Fetches user's role from `user_roles` table (checks all admin roles, not just "admin")
- Fetches granular permissions from `admin_permissions` table
- Owner email gets automatic owner role + wildcard permissions
- Exposes `adminRole`, `permissions`, `hasPermission()`, `isOwner`

### 3. Upgrade `src/contexts/AuthContext.tsx`

- Add `adminRole: string | null` to context
- Replace simple `eq("role", "admin")` with check against full `ADMIN_ROLE_SET`
- Keep `isAdmin` as convenience boolean (true if any admin role)
- Fix race condition (add `initialised` flag pattern from public app)

### 4. Create `src/components/admin/AdminGuard.tsx`

Route protection wrapper:
- Shows loading spinner during auth resolution
- Redirects to `/login` if not authenticated
- Shows "Access Denied" screen if authenticated but no admin role
- Accepts optional `requiredPermission` prop for granular checks
- Renders children only when authorized

### 5. Create `src/pages/admin/AdminLogin.tsx`

Dedicated admin login page:
- Email + password only (no signup)
- After login: checks admin role → dashboard or "Access Denied"
- "LayerLoot Admin Studio" branding
- Professional minimal design

### 6. Rewrite `src/App.tsx`

- Remove all storefront routes and providers (CartProvider, ChatWidget, PromotionPopup, etc.)
- Structure: `/login` → public, everything else → `AdminGuard` → `AdminShell`
- Flat admin routes: `/`, `/orders`, `/products`, `/settings`, `/admin-roles`, etc.

### 7. Create `src/components/admin/AdminShell.tsx`

Replace `AdminLayout.tsx` with a proper studio shell:
- Full sidebar with grouped navigation (Overview, Orders, Catalog, Marketing, Users, AI, Content, Settings, System)
- Permission-aware: hide nav items user can't access
- Top bar with user info + sign out
- No storefront components

### 8. Create `src/pages/admin/AdminRoles.tsx`

Admin management page:
- List all users with admin roles (via `admin-users` edge function)
- Show role badges with labels/colors
- Owner can change roles, invite new admins
- Uses `admin_invitations` table for invites
- Role hierarchy enforcement via `canManageRole()`

### 9. Create placeholder pages

For modules not yet migrated:
- `AdminAnalytics.tsx`, `AdminCampaigns.tsx`, `AdminRewards.tsx`, `AdminAITools.tsx`, `AdminSystem.tsx`
- Each shows title + "Module migration in progress"

### Files to create/modify (all in Admin Studio)

| File | Action |
|---|---|
| `index.html` | Update title + noindex |
| `src/lib/admin-permissions-map.ts` | Create — permission constants |
| `src/hooks/use-admin-permissions.ts` | Create — permission hook |
| `src/contexts/AuthContext.tsx` | Upgrade — full RBAC |
| `src/components/admin/AdminGuard.tsx` | Create — route protection |
| `src/components/admin/AdminShell.tsx` | Create — studio layout |
| `src/pages/admin/AdminLogin.tsx` | Create — admin login |
| `src/pages/admin/AdminRoles.tsx` | Create — role management |
| `src/App.tsx` | Rewrite — admin-only routing |
| `src/pages/admin/AdminAnalytics.tsx` | Create — placeholder |
| `src/pages/admin/AdminCampaigns.tsx` | Create — placeholder |
| `src/pages/admin/AdminRewards.tsx` | Create — placeholder |
| `src/pages/admin/AdminAITools.tsx` | Create — placeholder |
| `src/pages/admin/AdminSystem.tsx` | Create — placeholder |

No changes to the public LayerLoot project.

### Permission enforcement summary

- **Route level**: `AdminGuard` wraps all admin routes, checks `ADMIN_ROLE_SET` membership
- **Module level**: Individual routes can pass `requiredPermission` to guard
- **Action level**: `useAdminPermissions().hasPermission("orders.manage")` for button/action checks
- **Owner**: Always has wildcard `*` permission, cannot be demoted by lower roles
- **Hierarchy**: `canManageRole()` prevents privilege escalation

