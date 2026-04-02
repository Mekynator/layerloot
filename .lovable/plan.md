

# Upgrade Vouchers Module to 4-Tab Status System

## Problem
Currently the vouchers area has only 2 tabs (Active / Used), lumping gifted, used, and expired cards together. Users need clearer separation.

## Solution
Replace the 2-tab system with 4 tabs: **Active**, **Gifted**, **Used**, **Expired**. Add proper classification logic, tab counters with icons, contextual empty states, and tab-specific card content.

## Changes

### 1. `src/components/account/types.ts` — Add classification helper

Add a new function `classifyVoucher(v: UserVoucher): "active" | "gifted" | "used" | "expired"` that returns exactly one category per voucher:

- **Expired**: if `gift_status === "cancelled"` (treat as expired/voided)
- **Gifted**: if `gift_status` is `"pending_claim"`, `"gifted"`, or `"claimed"`, OR if `recipient_email` is set and the voucher was sent away by the current user
- **Used**: if `is_used`, `used_at` is set, or balance is 0 or less
- **Active**: everything else (owned, has balance, not gifted, not expired)

This replaces the binary `isVoucherUsedOrArchived` for the vouchers UI (keep existing function for backward compat elsewhere).

### 2. `src/components/account/VouchersModule.tsx` — Full rewrite of tab system

**State**: Change `voucherView` from `"active" | "used"` to `"active" | "gifted" | "used" | "expired"`.

**Filtering**: Use `classifyVoucher` to split `userVouchers` into 4 arrays, then group each with `groupVouchersByDefinition`.

**Tab bar**: 4 buttons with icons and counts:
- Active (Wallet icon) — "Ready to use"
- Gifted (Send icon) — "Sent to others"  
- Used (CheckCircle icon) — "Already used"
- Expired (Clock icon) — "No longer valid"

**Empty states**: Each tab gets a unique empty message with a relevant icon.

**Card content adapts per tab**:
- Active: show balance, code, expiry if available, gift button for gift cards
- Gifted: show recipient info, sent date, gifted status badge, hide gift button
- Used: show original value, used date, completed badge
- Expired: show original value, expired date, expired badge

**Gift action**: Only show the "Gift" button on the Active tab for gift cards owned by user.

### Summary
- 2 files changed: `types.ts` (add classifier), `VouchersModule.tsx` (4-tab UI)
- No database changes needed — all fields already exist on `user_vouchers`
- No breaking changes to other components using `isVoucherUsedOrArchived`

