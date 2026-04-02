

# Admin Dashboard & Customization System Upgrade

## Phase 1 — This Round (Core UI Changes + Settings Infrastructure)

### 1. Dashboard Cleanup
Remove from Dashboard UI only (keep backend data/hooks intact):
- **Loyalty Points** KPI card (line 213)
- **Vouchers Used** KPI card (line 214)
- **Smart Insights** section (lines 378-394)
- **Quick Navigation** section (lines 396-421) — replaced by configurable shortcuts

### 2. Sidebar Cleanup
Remove from `AdminLayout.tsx` sidebar `coreLinks` only:
- Orders, Custom Orders, Products, Customers (from core)
- Reviews, Showcases (from tools)

Keep: Dashboard, Categories & Tags, Page Editor, Settings in core. Keep remaining tools.
All removed pages remain routable — just hidden from nav.

### 3. Showcases Shortcut + Configurable Dashboard Shortcuts
Replace hardcoded Quick Navigation with a dynamic shortcut grid that reads from `site_settings` key `admin_dashboard_shortcuts`. Default shortcuts include all current ones plus Showcases. Each shortcut: `{ id, label, icon, to, visible }`.

### 4. Blue Borders on Dashboard Tiles
Add a shared CSS class to all dashboard cards/tiles:
- `border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)]`
- Hover: `hover:border-primary/35 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]`
- Apply to: KpiCard, MiniChart, Activity stream, Recent Orders, Low Stock, Action Center, Shortcut tiles

### 5. Dashboard Shortcuts Manager (Admin Settings tab)
New "Dashboard" tab in AdminSettings with:
- List of all available admin destinations
- Toggle visible/hidden per shortcut
- Editable label and icon (icon picker)
- Drag-to-reorder (simple up/down buttons initially)
- Persisted to `site_settings` key `admin_dashboard_shortcuts`

### 6. Sidebar Editor (Admin Settings tab)
New "Navigation" tab in AdminSettings with:
- List of all admin pages grouped by section (Core / Tools)
- Toggle visible/hidden per item
- Editable labels
- Move between groups
- Persisted to `site_settings` key `admin_sidebar_config`
- `AdminLayout` reads this config and renders dynamically

## Phase 2 — Follow-up Rounds
- **Item 7**: Rewards store / voucher admin editor (deep tile customization)
- **Item 8**: Account page admin customization
- **Item 9**: Custom order UI admin customization
- **Item 10**: Broader admin customization system (widget manager, presets, drag-and-drop)

---

## Technical Details

### Files to modify
| File | Changes |
|---|---|
| `src/pages/admin/Dashboard.tsx` | Remove Loyalty/Vouchers KPIs, Smart Insights, Quick Nav; add dynamic shortcuts grid with blue borders; apply border classes to all cards |
| `src/components/admin/AdminLayout.tsx` | Read sidebar config from `site_settings`; remove hardcoded entries for Orders/Custom Orders/Products/Customers/Reviews/Showcases; render dynamically |
| `src/pages/admin/AdminSettings.tsx` | Add "Dashboard" and "Navigation" tabs with shortcut manager and sidebar editor |

### Data storage
- `site_settings` key `admin_dashboard_shortcuts` — JSON array of shortcut objects
- `site_settings` key `admin_sidebar_config` — JSON object with groups and items
- No new tables needed

### Default shortcut list (when no config exists)
Products, Orders, Custom Orders, Showcases, Discounts, Categories, Shipping, Page Editor, Reviews, Users, Reports, Settings, Growth, Campaigns, Revenue Engine, Pricing

### Default sidebar config (when no config exists)
- Core: Dashboard, Categories & Tags, Page Editor, Settings
- Tools: Discounts, Shipping, Pricing, Growth, Campaigns, Revenue Engine, Reports

