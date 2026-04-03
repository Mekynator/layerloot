

# Customer Account Dashboard Redesign

## What Already Exists (no rebuild needed)
The account system is already comprehensive with: dashboard overview cards, order timeline component, custom order messaging with chat UI, rewards with interactive tier progress bar, vouchers (4-tab system), saved preferences with dynamic product options, settings with shipping address and language, notification dots, invoice download, reorder functionality, and product recommendations.

## What This Plan Adds/Upgrades

### 1. Sidebar navigation layout
Replace the top tab bar with a responsive left sidebar menu inside the account page. On mobile, it collapses to a horizontal scroll bar. Sidebar items: Dashboard, Orders, Custom Requests, Invoices (new), Rewards, Vouchers, Preferences, Settings.

**File:** `src/pages/Account.tsx` — restructure layout to 2-column with sidebar + content area. Add `Invoices` as a new tab value. Expand `MainTab` type.

### 2. Welcome header with customer name
Fetch `full_name` from profiles (already in the overview hook's profile fetch path). Display "Hello, {name}" prominently at the top with a greeting based on time of day.

**File:** `src/hooks/use-account-overview.ts` — add `profile` (full_name) to the returned data.
**File:** `src/pages/Account.tsx` — display personalized welcome.

### 3. Dashboard quick actions
Add a row of quick action buttons below the welcome: "Continue last order", "Create custom request", "View rewards", "Reorder previous".

**File:** `src/components/account/AccountDashboard.tsx` — add quick actions row.

### 4. Recently viewed products widget
Add a "Recently Viewed" row to the dashboard using the existing `useRecentlyViewedProducts` hook.

**File:** `src/components/account/AccountDashboard.tsx` — add recently viewed section.

### 5. Always-visible order timeline
Show the order timeline directly on each order card (not hidden behind "Review" click). Move review form into an expandable section.

**File:** `src/components/account/OrdersModule.tsx` — show `OrderTimeline` inline on every card.

### 6. Invoices section (new tab)
New dedicated Invoices tab listing all invoices with: invoice number, order reference, date, total, download button. Fetches from the `invoices` table.

**File:** New `src/components/account/InvoicesModule.tsx`
**File:** `src/hooks/use-account-overview.ts` — add invoices to the fetched data.

### 7. Expanded order detail inline
When clicking an order card, show expandable detail with: items list, shipping address, payment method (from order metadata if available).

**File:** `src/components/account/OrdersModule.tsx` — fetch and display order_items inline on expand. Query `order_items` for the expanded order.

### 8. Mobile-responsive sidebar
On screens < lg, the sidebar becomes a horizontal scrollable pill bar (similar to existing tab bar but with icons).

**File:** `src/pages/Account.tsx` — responsive classes.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/Account.tsx` | Sidebar layout, new Invoices tab, welcome header, expanded tab list |
| `src/components/account/AccountDashboard.tsx` | Quick actions, recently viewed section |
| `src/components/account/OrdersModule.tsx` | Always-visible timeline, expandable order detail with items |
| `src/components/account/InvoicesModule.tsx` | **New** — dedicated invoices list |
| `src/hooks/use-account-overview.ts` | Add profile name + invoices to query |
| `src/components/account/types.ts` | Add Invoice type, expand MainTab |

### No database changes needed
All required tables (`invoices`, `order_items`, `profiles`) already exist with correct RLS.

