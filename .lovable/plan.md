

# Fix & Upgrade Account Dashboard — Loyalty, Gift Cards, Vouchers

## Problems
1. **Wrong Gift Card Balance**: `AccountOverviewPanel` line 25-27 filters gift cards only by `is_used` and `balance > 0` — doesn't exclude gifted/expired cards
2. **Wrong Active Vouchers count**: line 23 only checks `!is_used && !used_at` — doesn't exclude gifted/expired
3. **Dashboard Rewards Progress**: `AccountDashboard` line 32 has same wrong active vouchers logic; line 35 uses hardcoded `[50, 100, 200, 500, 1000]` milestones instead of the real `REWARD_TIERS` from `use-loyalty-progress.ts`
4. **No interactive reward markers** on the progress bar — just a plain bar with no tier visualization

## Plan

### 1. Fix `AccountOverviewPanel.tsx` — Use `classifyVoucher`

Import `classifyVoucher` from `./types` and rewrite the tile calculations:

- **Active Vouchers count**: `userVouchers.filter(v => classifyVoucher(v) === "active").length`
- **Gift Card Balance**: filter to `classifyVoucher(v) === "active" && v.vouchers?.discount_type === "gift_card"`, then sum balances

This syncs with the Vouchers Module tabs exactly.

### 2. Fix `AccountDashboard.tsx` — Use `classifyVoucher` + real reward tiers

- **Active vouchers** (line 32): same fix as above
- **Rewards Progress card**: replace hardcoded milestones with `computeLoyaltyProgress()` from `use-loyalty-progress.ts`
- Replace the simple Progress bar with an **interactive rewards bar** showing tier markers

### 3. Build interactive Rewards Progress in `AccountDashboard.tsx`

Replace the current Rewards Progress card content with:

**A. Reward tier markers on progress bar:**
- Show all tiers from `REWARD_TIERS` (imported via `computeLoyaltyProgress`)
- Each tier rendered as a small labeled marker positioned along the bar
- Labels: "25 kr", "50 kr", "Free Delivery", "100 kr", "150 kr", "250 kr", "500 kr Gift Card"
- Visual states:
  - **Locked**: dimmed, `opacity-40`
  - **Available** (can redeem): glowing primary color, subtle pulse animation
  - **Next target**: highlighted with "Next reward in X pts" text

**B. Clickable tier markers:**
- On click, show a small popover/tooltip with:
  - Reward name
  - Cost in points
  - "Redeem" button if available (links to rewards tab via `onSwitchTab("rewards")`)

**C. "Rewards Available" CTA:**
- When `canRedeem` is true, show animated badge with count of redeemable rewards
- Clicking navigates to rewards store tab

**D. "Next reward in X points" text** below bar

### 4. Improve Recent Activity in `AccountOverviewPanel.tsx`

- Add earned/spent icons (green up arrow / red down arrow) per history row
- Slightly increase spacing

### Files Changed

| File | Change |
|------|--------|
| `src/components/account/AccountOverviewPanel.tsx` | Fix gift card balance + active vouchers using `classifyVoucher` |
| `src/components/account/AccountDashboard.tsx` | Fix active vouchers, replace rewards progress with interactive tier bar using `computeLoyaltyProgress` |

No database changes needed.

