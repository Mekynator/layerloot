

# Admin Roles, Permissions & Activity Tracking System

## Current State
- Single `app_role` enum with values `admin`, `moderator`, `user`
- `user_roles` table links users to roles
- `has_role()` security definer function checks role membership
- `AdminRoute` component checks binary `isAdmin` (admin or not)
- No granular permissions, no activity logging, no multi-tier admin access

## Architecture

### Database Changes

**Migration 1: Extend `app_role` enum + create permissions & activity tables**

```sql
-- Add new admin role levels
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

-- Permission definitions per role
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read permissions" ON public.admin_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage permissions" ON public.admin_permissions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Seed default permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin','*'),
  ('admin','products.manage'),('admin','orders.manage'),('admin','customers.view'),
  ('admin','reviews.manage'),('admin','showcases.manage'),('admin','discounts.manage'),
  ('admin','shipping.manage'),('admin','content.edit'),('admin','content.publish'),
  ('admin','categories.manage'),('admin','pricing.manage'),('admin','campaigns.manage'),
  ('admin','reports.view'),('admin','revenue.view'),('admin','backgrounds.manage'),
  ('admin','settings.view'),
  ('editor','content.edit'),('editor','content.preview'),('editor','backgrounds.manage'),
  ('editor','categories.manage'),
  ('support','orders.manage'),('support','customers.view'),('support','reviews.manage');

-- Activity log
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_role text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  summary text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin roles can view activity" ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Any admin can insert activity" ON public.admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activity_created ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_activity_user ON public.admin_activity_log (user_id);
```

**Migration 2: Create `has_permission` security definer function**

```sql
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions ap
    JOIN public.user_roles ur ON ur.role = ap.role
    WHERE ur.user_id = _user_id
      AND (ap.permission = _permission OR ap.permission = '*')
  )
$$;
```

### Code Changes

**1. New: `src/hooks/use-admin-permissions.ts`**
- Hook that loads the current user's admin role and resolved permissions list
- Exposes `{ adminRole, permissions, hasPermission(p), loading }`
- Queries `user_roles` + `admin_permissions` on mount
- Caches in state; provides `can('content.publish')` style checks

**2. New: `src/lib/activity-log.ts`**
- Helper `logAdminActivity({ userId, userEmail, userRole, action, entityType, entityId, summary, metadata })`
- Inserts into `admin_activity_log`
- Used across editors: publish, save draft, order status change, role change, etc.

**3. New: `src/pages/admin/AdminActivity.tsx`**
- Activity log viewer page with table of recent actions
- Filters by user, action type, date range, entity type
- Pagination support

**4. New: `src/pages/admin/AdminUsers.tsx`**
- Admin user management page (super_admin only)
- Lists users with their roles from `admin-users` edge function
- Assign/change roles via `user_roles` table
- Shows last login, role badge

**5. Modify: `src/components/admin/AdminRoute.tsx`**
- Accept optional `requiredPermission` prop
- Check `has_permission` in addition to basic admin check
- Redirect to dashboard with toast if insufficient permission

**6. Modify: `src/contexts/AuthContext.tsx`**
- Expand `isAdmin` to also recognize `super_admin`, `editor`, `support` roles
- Add `adminRole: string | null` to context
- Add `permissions: string[]` to context

**7. Modify: `src/components/admin/AdminLayout.tsx`**
- Filter sidebar items based on user permissions
- Add "Activity Log" and "Admin Users" sidebar items
- Map each sidebar item `id` to a required permission

**8. Modify: `src/App.tsx`**
- Add routes for `/admin/activity` and `/admin/users`
- Pass `requiredPermission` to `AdminRoute` for restricted pages:
  - `/admin/settings` → `settings.view`
  - `/admin/users` → `*` (super_admin only)
  - `/admin/editor` → `content.edit`
  - etc.

**9. Modify: `src/components/admin/DraftActionBar.tsx`**
- Accept `canPublish` prop; disable Publish button if false
- Consumer components pass `hasPermission('content.publish')`

**10. Sprinkle `logAdminActivity()` calls** into:
- `use-draft-publish.ts` (publish, revert)
- `AdminSettings.tsx` (publish settings)
- `AdminOrders.tsx` (status changes)
- `AdminRoute.tsx` (login tracking via auth state)

### Permission-to-Route Map

| Route | Permission |
|---|---|
| `/admin` | any admin role |
| `/admin/products` | `products.manage` |
| `/admin/orders` | `orders.manage` |
| `/admin/clients` | `customers.view` |
| `/admin/editor` | `content.edit` |
| `/admin/backgrounds` | `backgrounds.manage` |
| `/admin/settings` | `settings.view` |
| `/admin/users` | `*` |
| `/admin/activity` | `reports.view` |
| `/admin/discounts` | `discounts.manage` |
| `/admin/shipping` | `shipping.manage` |
| `/admin/pricing` | `pricing.manage` |
| `/admin/reviews` | `reviews.manage` |
| `/admin/reports` | `reports.view` |

### Files Summary

| Action | File |
|---|---|
| Create | `src/hooks/use-admin-permissions.ts` |
| Create | `src/lib/activity-log.ts` |
| Create | `src/pages/admin/AdminActivity.tsx` |
| Create | `src/pages/admin/AdminUsers.tsx` |
| Modify | `src/components/admin/AdminRoute.tsx` |
| Modify | `src/contexts/AuthContext.tsx` |
| Modify | `src/components/admin/AdminLayout.tsx` |
| Modify | `src/components/admin/DraftActionBar.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/hooks/use-draft-publish.ts` (add activity logging on publish/revert) |

### Database Changes Summary
- Extend `app_role` enum: +`super_admin`, +`editor`, +`support`
- Create `admin_permissions` table with role-permission mapping + seed data
- Create `admin_activity_log` table with admin-only RLS
- Create `has_permission()` security definer function

