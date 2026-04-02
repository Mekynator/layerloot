

# Admin Operations Workflow: Orders, Custom Orders & Communications

## Summary
Restructure the admin portal to clearly separate **operations** (orders, custom orders, fulfillment, communications) from **content/CMS** and **commerce/catalog**. Improve order detail workspaces, add internal notes separation, richer status workflows, production timelines, and activity logging.

## Current State
- `AdminOrders.tsx` (463 lines): merges store + custom orders in one table, basic dialog for details
- `AdminCustomOrders.tsx` (1473 lines): extensive custom order workflow with messages, quoting, 3D preview — already quite capable
- `custom_order_messages` table exists with `sender_role` (user/admin/system) and `message_type` (note/quote/counter_offer/status_update/system)
- `order_status_history` table exists for store orders
- `OrderTimeline` component shows 4 public stages (Received, Printing, Finishing, Shipped)
- Sidebar has no "Operations" group — orders/custom orders are not in the default sidebar config
- `logAdminActivity()` helper exists but is not called from order workflows
- No internal notes table separate from customer messages
- No dedicated order detail page (uses dialog)

## Architecture

### Sidebar Reorganization
Restructure `DEFAULT_SIDEBAR_CONFIG` into 4 groups:

```text
Content:     Dashboard, Page Editor, Media, Reusable Blocks, Translations, Backgrounds, Settings
Commerce:    Products, Categories, Discounts, Pricing, Showcases
Operations:  Orders, Custom Orders, Clients
Tools:       Shipping, Growth, Campaigns, Revenue, Reports
System:      Activity Log, Admin Users
```

### Database Changes

**New table: `admin_internal_notes`** — for staff-only notes on any entity:
- `id` uuid PK
- `entity_type` text (order, custom_order, product, customer)
- `entity_id` text
- `user_id` uuid (author)
- `note` text
- `is_pinned` boolean default false
- `created_at` timestamptz
- RLS: admin-only (read/write)

**Seed permissions:**
- `orders.manage` for super_admin, admin, support
- `custom_orders.manage` for super_admin, admin, support

No schema changes to `orders` or `custom_orders` tables — the existing columns and statuses are sufficient. The richer status set will be handled in the UI layer using the existing `status` text column.

### New Files

**1. `src/pages/admin/AdminOrderDetail.tsx`**
Full-page order detail workspace (replaces dialog) for store orders:
- Customer info, items list, totals
- Status management with expanded statuses: new, paid, processing, printing, finishing, packed, shipped, delivered, completed, cancelled, refunded, on_hold
- Tracking number/URL editing
- Internal notes panel (from `admin_internal_notes`)
- Order status history timeline (from `order_status_history`)
- Activity log integration (calls `logAdminActivity` on status changes)
- Payment state display
- Notes visible vs internal separation

**2. `src/pages/admin/AdminCustomOrderDetail.tsx`**
Full-page custom order detail workspace (extracts from current dialog):
- All current custom order detail functionality moved from dialog to dedicated page
- Customer info, uploaded files, 3D preview
- Quote workflow (prepare, send, accept/decline counter)
- Communication thread with clear visual separation:
  - Customer messages (left-aligned)
  - Admin messages (right-aligned)
  - System/status updates (centered, muted)
  - Internal notes (separate tab/section, never shown to customer)
- Production timeline with expanded stages
- Payment status panel
- File attachments view
- Activity log integration

**3. `src/hooks/use-admin-notes.ts`**
Hook for internal notes CRUD:
- `useAdminNotes(entityType, entityId)` — fetch notes
- `addNote(text)` — insert note + log activity
- `deleteNote(noteId)` — soft indication only
- `togglePin(noteId)` — pin/unpin

### Modified Files

**`src/components/admin/AdminLayout.tsx`**
- Restructure sidebar groups: Content, Commerce, Operations, Tools, System
- Add Orders (ShoppingCart icon) and Custom Orders (Package icon) under Operations
- Add Clients under Operations
- Move Products, Categories, Discounts, Pricing, Showcases under Commerce

**`src/pages/admin/AdminOrders.tsx`**
Major refactor:
- Remove custom orders from this page (they have their own section)
- Add search (by order ID, customer name/email)
- Add date range filter
- Add payment status filter
- Expand status set in UI
- Replace detail dialog with navigation to `/admin/orders/:orderId`
- Add status badges with colors
- Add activity logging on status changes
- Add bulk quick-action buttons (mark shipped, mark completed)

**`src/pages/admin/AdminCustomOrders.tsx`**
Refactor:
- Keep list view but simplify
- Move detail view to `/admin/custom-orders/:orderId` (new page)
- Add search by name/email/ID
- Add status filter
- Navigate to detail page instead of opening dialog

**`src/App.tsx`**
- Add routes: `/admin/orders/:orderId` → `AdminOrderDetail`
- Add routes: `/admin/custom-orders/:orderId` → `AdminCustomOrderDetail`

**`src/components/orders/OrderTimeline.tsx`**
- Add more internal stages for admin view (review, quality check, packed)
- Add `adminMode` prop that shows all stages vs customer-safe subset
- Customer view remains: Received → Printing → Finishing → Shipped

### Activity Logging Integration
Add `logAdminActivity()` calls for:
- Order status changed
- Custom order status changed
- Quote sent
- Customer message sent
- Internal note added
- Production stage updated
- Payment status changed
- Tracking info updated

### Permission Mapping
| Action | Permission |
|---|---|
| View/manage orders | `orders.manage` |
| View/manage custom orders | `custom_orders.manage` |
| View customers | `customers.view` |

## Files Summary
| Action | File |
|---|---|
| Create | `src/pages/admin/AdminOrderDetail.tsx` |
| Create | `src/pages/admin/AdminCustomOrderDetail.tsx` |
| Create | `src/hooks/use-admin-notes.ts` |
| Modify | `src/components/admin/AdminLayout.tsx` (reorganize sidebar) |
| Modify | `src/pages/admin/AdminOrders.tsx` (store-only, search, link to detail) |
| Modify | `src/pages/admin/AdminCustomOrders.tsx` (simplify, link to detail) |
| Modify | `src/App.tsx` (add detail routes) |
| Modify | `src/components/orders/OrderTimeline.tsx` (admin mode stages) |

## Database Changes Summary
- **Create** `admin_internal_notes` table with admin-only RLS
- **Seed** `orders.manage` and `custom_orders.manage` permissions

