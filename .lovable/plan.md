

## Redesign Account Area — Unified Dashboard Hub

### Current State

The account area has **9 separate tabs** in a sidebar: Dashboard, Orders, Custom Requests, Invoices, Rewards, Vouchers, Referrals, Preferences, Settings. The Dashboard tab itself (`AccountDashboard.tsx`, 513 lines) already shows summary cards for orders, rewards, referrals, custom orders, preferences, recently viewed, and recommendations. `AccountOverviewPanel.tsx` adds a loyalty points banner on top. This means the dashboard is already quite dense, and switching between 9 tabs feels fragmented.

### Architecture

**Eliminate the sidebar/tab system.** Replace it with a single scrollable dashboard page where each feature area is a compact summary card. Clicking any card opens a **Sheet (drawer)** containing the full module. This removes the need for separate tab navigation entirely.

```text
┌─────────────────────────────────────────────────┐
│ Greeting + email + Sign Out           [Admin]   │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │ Points  │ │ Orders  │ │Vouchers │ │Gift $  │ │  ← stat tiles
│ └─────────┘ └─────────┘ └─────────┘ └────────┘ │
├─────────────────────────────────────────────────┤
│ Quick Actions (smart, contextual)               │
├─────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ Latest Order     │ │ Rewards Progress │       │  ← summary cards
│ │ [View All →]     │ │ [Reward Store →] │       │    click → Sheet
│ └──────────────────┘ └──────────────────┘       │
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ Custom Requests  │ │ Invite Friends   │       │
│ │ [View All →]     │ │ [Details →]      │       │
│ └──────────────────┘ └──────────────────┘       │
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ My Vouchers      │ │ Settings         │       │
│ │ [Manage →]       │ │ [Edit →]         │       │
│ └──────────────────┘ └──────────────────┘       │
│ Recently Viewed (if any)                        │
│ Recommended (if any)                            │
└─────────────────────────────────────────────────┘
```

Clicking "View All" / "Details" / "Manage" opens a **right-side Sheet** containing the existing module component (OrdersModule, RewardsModule, etc.). The URL updates with `?section=orders` for deep-linking.

### Changes

#### 1. Redesign `Account.tsx` — Remove sidebar/tabs, single dashboard view
- Remove the sidebar nav and mobile pill bar
- Remove the tab-switching state machine
- Render one unified dashboard layout
- Add Sheet-based detail views: each "View All" button opens a `<Sheet>` with the full module
- Keep `?section=X` URL param for deep-linking (auto-open the right sheet on load)
- Keep notification dot logic for orders/custom-requests (show on summary cards)

#### 2. Merge `AccountOverviewPanel` into the dashboard
- Remove `AccountOverviewPanel` as a separate component
- Integrate the stat tiles (points, orders, vouchers, gift card balance) directly into the dashboard header as a compact 4-tile row
- Remove the collapsible loyalty history from the top — move it inside the Rewards sheet instead

#### 3. Simplify `AccountDashboard.tsx` — Leaner summary cards
- Remove the heavy referral stats grid (4 cards) — consolidate into 1 compact referral summary card
- Remove inline recently-viewed and recommended product grids from the main dashboard — keep them as smaller preview rows (2 items max on mobile, 4 on desktop)
- Make each summary card a clickable trigger that opens the corresponding Sheet
- Remove redundant "View all" buttons — the entire card becomes clickable
- Keep Smart Quick Actions but cap at 3 visible + overflow

#### 4. Create `AccountSheetView.tsx` — Reusable detail drawer
- New component wrapping `<Sheet>` with consistent header, close button, back-to-dashboard behavior
- Receives `section` prop and renders the appropriate module: OrdersModule, CustomOrdersModule, InvoicesModule, RewardsModule, VouchersModule, ReferralModule, SavedPreferencesModule, SettingsModule
- Full-height sheet sliding from right on desktop, bottom sheet on mobile
- Pass all existing module props through

#### 5. Mobile optimization
- Dashboard cards stack vertically in a single column
- Sheet opens as full-screen overlay on mobile (side="bottom" or "right" with full height)
- Stat tiles become 2x2 grid on mobile
- Quick actions wrap to 2 rows max, overflow hidden behind "more" button

### Files

| File | Action |
|------|--------|
| `src/pages/Account.tsx` | Rewrite — remove sidebar/tabs, single dashboard + Sheet-based detail views |
| `src/components/account/AccountDashboard.tsx` | Simplify — leaner summary cards, remove heavy inline sections |
| `src/components/account/AccountOverviewPanel.tsx` | Remove — merge stat tiles into Account.tsx |
| `src/components/account/AccountSheetView.tsx` | New — reusable Sheet wrapper that renders detail modules |

### What stays unchanged
- All module components (OrdersModule, CustomOrdersModule, InvoicesModule, RewardsModule, VouchersModule, ReferralModule, SavedPreferencesModule, SettingsModule) — their internals remain identical
- All data hooks (useAccountOverview, useReferrals, etc.)
- All types and utility functions
- AccountDropdown in header

### Technical Notes
- No database changes
- No new dependencies — uses existing Sheet, Card, Badge, Button components
- Deep-linking via `?section=orders` opens the corresponding Sheet on mount
- Notification dots (hasNewOrders, hasNewCustomRequests) move to summary card badges
- Loyalty history moves inside the Rewards sheet (inside RewardsModule or as a collapsible within the sheet)

