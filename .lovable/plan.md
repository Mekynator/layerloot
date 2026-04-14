

# LayerLoot Admin Studio — Private Access & Identity Setup

## Problem

The Admin Studio project (`layerloot-forge`) is still structured as a storefront clone with admin routes bolted on:
- `App.tsx` still includes all public storefront routes (Index, Products, Cart, Gallery, etc.)
- Uses storefront `Layout.tsx` with Header, Footer, FloatingCartSummary, ChatWidget, PromotionPopup
- `index.html` still says "Lovable App" with no admin identity
- Auth page redirects to `/account` (customer flow) instead of admin dashboard
- `AdminLayout.tsx` has a "Back to Store" link and lives inside the storefront Layout
- `AuthContext` only checks for a single `admin` role, not the full RBAC system
- No route protection — all admin pages are accessible without guards
- All storefront pages (Cart, Gallery, About, etc.) are still routable

## Plan

### 1. Update `index.html` — Admin Identity

Set title to "LayerLoot Admin Studio", add `noindex/nofollow`, remove storefront OG tags. Professional private app metadata.

### 2. Rewrite `App.tsx` — Admin-Only Routing

Strip all storefront routes and providers. New structure:

```text
/login          → AdminLogin (public)
/               → AdminGuard → AdminShell (layout with sidebar)
  /             → Dashboard
  /analytics    → AdminAnalytics (placeholder)
  /orders       → AdminOrders
  /custom-orders→ AdminCustomOrders
  /products     → AdminProducts
  /products/:id/variants → AdminVariants
  /categories   → AdminCategories
  /users        → AdminClients
  /admin-roles  → AdminRoles (placeholder)
  /reviews      → AdminReviews
  /campaigns    → placeholder
  /rewards      → AdminDiscounts
  /ai-tools     → placeholder
  /content      → AdminContent
  /editor       → PageEditor
  /showcases    → AdminShowcases
  /shipping     → AdminShipping
  /settings     → AdminSettings
  /system       → placeholder
```

Remove: CartProvider, ChatWidget, PromotionPopup, GiftClaimPopup, storefront Layout wrapper.

### 3. Create `AdminLogin.tsx` — Dedicated Admin Login

Replace the customer Auth page with a clean admin-focused login:
- No signup option (admins are invited, not self-registered)
- Login-only form with email/password
- On success: check admin role → redirect to `/` (dashboard) or show "Access Denied"
- Professional branding: "LayerLoot Admin Studio" title, no storefront logo
- Dark, minimal design

### 4. Create `AdminGuard.tsx` — Route Protection

A wrapper component that:
- Shows loading spinner while auth state resolves
- Redirects to `/login` if not authenticated
- Shows "Access Denied" screen if authenticated but not admin
- Renders children (the admin shell) only for valid admins
- No flicker — blocks rendering until role is confirmed

### 5. Upgrade `AuthContext.tsx` — Full RBAC Support

Update from simple `isAdmin: boolean` to match the public app's richer system:
- Add `adminRole: string | null` field
- Check `user_roles` table for any admin-level role (owner, super_admin, admin, editor, support, content_admin, etc.)
- Use the `ADMIN_ROLE_SET` pattern from the public app's existing `admin-permissions-map.ts`
- Keep `isAdmin` as a convenience boolean

### 6. Create `AdminShell.tsx` — Private Studio Layout

Replace the storefront Layout with a dedicated admin shell:
- Full-height sidebar with grouped navigation (same groups as the memory: Overview, Orders, Catalog, Marketing, Users, AI, Content, Settings, System)
- Top bar with user info, sign-out button
- No Header/Footer/storefront components
- Uses `<Outlet />` for nested routing
- Professional dark admin aesthetic

### 7. Clean Up / Delete Storefront Files

Remove or isolate storefront pages that have no admin purpose:
- Delete from routing: Index, Products, ProductDetail, Cart, Contact, Gallery, About, CreateYourOwn, Creations, CreationDetail, SubmitDesign, DynamicPage, OrderTracking, Account
- Delete storefront layout components: `Layout.tsx` (storefront), `Header.tsx`, `Footer.tsx`, `FloatingCartSummary`, `ChatWidget`, `PromotionPopup`, `GiftClaimPopup`, `GlobalSectionRenderer`, `PageBackgroundSlideshow`, `ThemeRuntime`
- The page files can remain on disk for now but must not be routed

### 8. Create Placeholder Pages

For sections not yet migrated, create minimal placeholder components:
- AdminAnalytics, AdminRoles, AdminCampaigns, AdminAITools, AdminSystem
- Each shows the page title and "Coming soon — module migration in progress"

### Files Modified (in Admin Studio project)

| File | Action |
|---|---|
| `index.html` | Update metadata/title |
| `src/App.tsx` | Complete rewrite — admin-only routing |
| `src/contexts/AuthContext.tsx` | Add `adminRole`, full RBAC check |
| `src/pages/admin/AdminLogin.tsx` | New — admin login page |
| `src/components/admin/AdminGuard.tsx` | New — route protection wrapper |
| `src/components/admin/AdminShell.tsx` | New — private studio layout with sidebar |
| `src/pages/admin/AdminAnalytics.tsx` | New — placeholder |
| `src/pages/admin/AdminRoles.tsx` | New — placeholder |
| `src/pages/admin/AdminCampaigns.tsx` | New — placeholder |
| `src/pages/admin/AdminAITools.tsx` | New — placeholder |
| `src/pages/admin/AdminSystem.tsx` | New — placeholder |

No changes to the public LayerLoot project.

