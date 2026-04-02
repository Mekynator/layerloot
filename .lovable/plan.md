

# Account Page — Modular Admin-Controlled System

## Current State
- Account.tsx is a 1766-line monolith with 5 hardcoded tabs: Orders, Custom Requests, Rewards Store, My Vouchers, Settings
- All layout, tab order, visibility, labels, icons, and styling are hardcoded
- No admin configuration exists for the account page
- Logic for orders, vouchers, custom orders, rewards, settings all lives in one file

## Architecture

Store account page configuration in `site_settings` under key `account_page_config`:
```json
{
  "modules": [
    { "id": "orders", "label": "Orders", "icon": "Package", "visible": true, "order": 0 },
    { "id": "custom-requests", "label": "Custom Requests", "icon": "MessageSquare", "visible": true, "order": 1 },
    { "id": "rewards", "label": "Rewards Store", "icon": "Gift", "visible": true, "order": 2 },
    { "id": "vouchers", "label": "My Vouchers", "icon": "Star", "visible": true, "order": 3 },
    { "id": "settings", "label": "Settings", "icon": "Settings", "visible": true, "order": 4 }
  ],
  "defaultTab": "orders",
  "showLoyaltySummary": true,
  "overviewTiles": ["points", "activeVouchers", "totalOrders", "giftCardBalance"],
  "style": {
    "cardBorder": "primary/20",
    "hoverAnimation": "lift",
    "tabStyle": "pills"
  }
}
```

## Phase 1 — Modular Refactor + Admin Editor (this round)

### 1. Split Account.tsx into module components
Extract each tab's content into its own component file to make Account.tsx manageable:

| New File | Content |
|---|---|
| `src/components/account/AccountOverviewPanel.tsx` | Points balance, earned/spent tiles, activity history |
| `src/components/account/OrdersModule.tsx` | Order list with timeline, reorder, review |
| `src/components/account/CustomOrdersModule.tsx` | Custom orders with conversation, quotes, fee handling |
| `src/components/account/RewardsModule.tsx` | Rewards store grid (already DB-driven) |
| `src/components/account/VouchersModule.tsx` | Active/used vouchers with gifting |
| `src/components/account/SettingsModule.tsx` | Shipping address + language preference |

Each module receives the same props interface: `{ user, overview, refetchOverview, tt }`.
Account.tsx becomes a thin shell that fetches config, renders tabs dynamically, and delegates to modules.

### 2. Dynamic tab rendering in Account.tsx
- Fetch `account_page_config` from `site_settings` on mount
- Render only `visible: true` modules in `order` sequence
- Use configured `label` and `icon` for tab buttons
- Default to hardcoded fallback if no config exists (backward compatible)
- Support `defaultTab` from config

### 3. Account Page Editor in AdminSettings
Add an "Account Page" tab to AdminSettings with:
- **Module manager**: list of all modules with toggle visible/hidden, editable label, icon picker, up/down reorder
- **Overview tiles**: toggle which summary tiles show (points, vouchers, orders, gift card balance)
- **Behavior**: default tab selector, toggle loyalty summary visibility
- **Style**: card border color, hover animation choice (lift/glow/none), tab style (pills/underline)
- Persisted via `upsertSetting("account_page_config", ...)`

### 4. Account Overview Panel upgrade
Make the top loyalty summary area configurable:
- Show/hide based on `showLoyaltySummary` config
- Configurable overview tiles (points balance, active vouchers count, total orders, gift card total balance)
- Each tile styled with the admin-configured border/animation settings

## Files to create
| File | Purpose |
|---|---|
| `src/components/account/AccountOverviewPanel.tsx` | Loyalty summary + configurable overview tiles |
| `src/components/account/OrdersModule.tsx` | Orders tab content |
| `src/components/account/CustomOrdersModule.tsx` | Custom requests tab content |
| `src/components/account/RewardsModule.tsx` | Rewards store tab content |
| `src/components/account/VouchersModule.tsx` | Vouchers tab content |
| `src/components/account/SettingsModule.tsx` | Settings tab content |
| `src/components/account/types.ts` | Shared types and interfaces |

## Files to modify
| File | Change |
|---|---|
| `src/pages/Account.tsx` | Slim down to ~200 lines: fetch config, render dynamic tabs, delegate to modules |
| `src/pages/admin/AdminSettings.tsx` | Add "Account Page" tab with module manager |

## No database changes needed
- Uses existing `site_settings` table for config storage

