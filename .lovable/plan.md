

# Role-Based, Action-Focused Admin Dashboard

## Summary
Rebuild the dashboard into a modular, role-aware control center that shows each admin user only what's relevant to their role, prioritizing actionable items over static reporting.

## Architecture

### Widget System
Each dashboard section becomes a self-contained widget component. A configuration map defines which widgets appear for which roles:

```text
Widget                  | super_admin | admin | editor | support
─────────────────────────────────────────────────────────────────
ActionCenter (queues)   |     ✓       |   ✓   |   ✗    |   ✓
KPI tiles               |     ✓       |   ✓   |   ✗    |   ✗
ContentStatus           |     ✓       |   ✓   |   ✓    |   ✗
OperationsQueue         |     ✓       |   ✓   |   ✗    |   ✓
QuickShortcuts          |     ✓       |   ✓   |   ✓    |   ✓
RecentActivity          |     ✓       |   ✓   |   ✓    |   ✓
TranslationStatus       |     ✓       |   ✓   |   ✓    |   ✗
ProductAttention        |     ✓       |   ✓   |   ✗    |   ✗
Charts                  |     ✓       |   ✓   |   ✗    |   ✗
```

### Data Hook Enhancement
Extend `use-admin-dashboard.ts` to also fetch:
- Draft content counts (site_blocks with `has_draft = true`)
- Scheduled publishes (site_blocks + products with `scheduled_publish_at` set)
- Products with `status = 'draft'` (unpublished)
- Unanswered custom order messages (messages where last message is from customer)
- Translation stats (missing/outdated from `translation_entries`)
- Admin activity log entries (recent from `admin_activity_log`)
- Orders on hold, awaiting shipment counts

## New Files

### `src/components/admin/dashboard/DashboardWidget.tsx`
Wrapper component providing consistent card styling, title, optional link, and role-visibility check. All widgets use this wrapper.

### `src/components/admin/dashboard/ActionCenterWidget.tsx`
Top-priority queue widget showing urgent items:
- Pending orders, quotes awaiting, customer replies, reviews pending, showcases pending, low stock, on-hold orders
- Each item links to filtered admin page
- Color-coded severity

### `src/components/admin/dashboard/ContentStatusWidget.tsx`
For editor/admin roles:
- Draft blocks pending publish (count + link)
- Scheduled publishes upcoming
- Recently published content
- Draft products not yet published

### `src/components/admin/dashboard/OperationsWidget.tsx`
For support/admin/super_admin:
- Orders needing shipment
- Orders on hold
- Custom orders needing quote
- Unanswered customer messages
- Production queue summary

### `src/components/admin/dashboard/TranslationWidget.tsx`
For editor/admin:
- Missing translations by locale
- Outdated translations count
- Link to translation manager

### `src/components/admin/dashboard/ProductAttentionWidget.tsx`
For admin/super_admin:
- Draft products
- Low stock products
- Hidden/unpublished products count

### `src/components/admin/dashboard/QuickActionsWidget.tsx`
Role-filtered shortcut grid. Each shortcut has a `permission` field; only shortcuts the user has permission for are shown. Replaces current flat grid with role-aware filtering.

### `src/components/admin/dashboard/RecentActivityWidget.tsx`
Reads from `admin_activity_log` instead of fabricating events from orders/reviews. Shows real admin actions with role-based filtering.

## Modified Files

### `src/hooks/use-admin-dashboard.ts`
Add to `DashboardData`:
- `draftBlocksCount`, `scheduledPublishCount`, `draftProductsCount`
- `ordersAwaitingShipment`, `ordersOnHold`
- `unansweredCustomMessages`
- `missingTranslations`, `outdatedTranslations`

Add parallel queries for these counts using lightweight `head: true` count queries.

### `src/pages/admin/Dashboard.tsx`
Complete rewrite:
- Import `useAdminPermissions` to get `adminRole` and `hasPermission`
- Compose dashboard from widget components based on role config
- Remove inline chart/tile definitions (moved to widget components)
- Layout: action center → KPIs → content/operations row → charts → activity → shortcuts
- Greeting header with role label
- Keep period selector for KPI/chart widgets

## Widget Rendering Logic

```typescript
const ROLE_WIDGETS: Record<AdminRole, string[]> = {
  super_admin: ["action", "kpi", "content", "operations", "product", "translation", "charts", "activity", "shortcuts"],
  admin: ["action", "kpi", "content", "operations", "product", "translation", "charts", "activity", "shortcuts"],
  editor: ["content", "translation", "activity", "shortcuts"],
  support: ["action", "operations", "activity", "shortcuts"],
};
```

Dashboard renders widgets in order, skipping any not in the role's list.

## Files Summary
| Action | File |
|---|---|
| Create | `src/components/admin/dashboard/DashboardWidget.tsx` |
| Create | `src/components/admin/dashboard/ActionCenterWidget.tsx` |
| Create | `src/components/admin/dashboard/ContentStatusWidget.tsx` |
| Create | `src/components/admin/dashboard/OperationsWidget.tsx` |
| Create | `src/components/admin/dashboard/TranslationWidget.tsx` |
| Create | `src/components/admin/dashboard/ProductAttentionWidget.tsx` |
| Create | `src/components/admin/dashboard/QuickActionsWidget.tsx` |
| Create | `src/components/admin/dashboard/RecentActivityWidget.tsx` |
| Modify | `src/hooks/use-admin-dashboard.ts` (add draft/scheduled/ops counts) |
| Modify | `src/pages/admin/Dashboard.tsx` (role-based widget composition) |

No database changes required — all data comes from existing tables.

