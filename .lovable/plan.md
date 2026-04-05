

## Phase 3: Full UI, Admin UI, Dashboard Integration & Live Data Wiring

### Current State

Most of Phase 3 is **already implemented**:
- `ReferralModule.tsx` — full invite link, email invite, stats grid, achievement cards, referral history
- `use-referrals.ts` — hooks for fetching referral data, sending invites, generating codes
- `ReferralStatsWidget.tsx` — admin dashboard widget with stats and top inviters
- `AdminDiscounts.tsx` — audience group targeting (specific, existing, new_registered, newcomers, invited) with JSON config storage
- Account page has "Referrals" tab wired to `ReferralModule`
- Admin Dashboard includes `ReferralStatsWidget`

### What Still Needs Work

#### 1. ReferralModule Improvements
- Add loading/skeleton state (currently returns empty object on load)
- Add "rewarded" status to status config (only has pending/registered/ordered)
- Add points-earned-per-referral display in history rows
- Add explanation text about how rewards work (25 pts inviter, 15 pts invited)
- Add empty state for zero referrals

#### 2. Account Dashboard — Referral Summary Cards
- `AccountDashboard.tsx` has no referral data integration
- Add 4 referral summary cards (Friends Invited, Accounts Created, First Orders, Referral Points) matching existing tile style
- Wire to `useReferrals` hook
- Add "Invite Friends" quick action to smart actions engine

#### 3. Rewards History Integration
- `AccountOverviewPanel.tsx` shows loyalty history but referral points have no special labeling
- Add referral-specific icons/labels in points history (distinguish "Referral reward" entries)

#### 4. ReferralStatsWidget Admin Improvements
- Use dynamic `inviter_points_amount`/`invited_points_amount` from DB instead of hardcoded `* 25` / `* 15`
- Add date-range filter (today/this week/all time)
- Add link to a full admin referral management page

#### 5. Admin Referral Management Page
- Create `src/pages/admin/AdminReferrals.tsx` with full table view
- Search, filter by status/date/inviter, sort
- Show all invite rows with inviter email, invited email, status, dates, points
- Add route in `App.tsx`

#### 6. Discount Targeting UI Polish
- Add helper text explaining each audience group in the discount form
- Add validation warning when no group is selected
- Add preview count showing "~X users currently match"

#### 7. Cart/Checkout Discount Feedback
- Ensure invited user discounts show proper eligibility messaging in cart
- No false eligibility — validate against `validate-discount-eligibility` edge function

### Files to Create/Edit

| File | Action | Description |
|------|--------|-------------|
| `src/components/account/ReferralModule.tsx` | Edit | Add skeleton, rewarded status, per-row points, empty state, reward explanation |
| `src/components/account/AccountDashboard.tsx` | Edit | Add referral summary cards + invite quick action |
| `src/components/account/AccountOverviewPanel.tsx` | Edit | Label referral points in history |
| `src/components/admin/dashboard/ReferralStatsWidget.tsx` | Edit | Use dynamic point amounts, add date filter |
| `src/pages/admin/AdminReferrals.tsx` | Create | Full admin referral management page |
| `src/pages/admin/AdminDiscounts.tsx` | Edit | Add helper text and validation for audience groups |
| `src/App.tsx` | Edit | Add admin referrals route |
| `src/components/admin/AdminLayout.tsx` | Edit | Add referrals nav item |

### Technical Notes

- All data comes from existing `referral_invites` table and `use-referrals` hook
- Admin page uses service-accessible queries (admin RLS policies already exist)
- No new database changes needed — Phase 2 schema is sufficient
- Referral points in loyalty history are identified by `reason` field containing "Referral reward"

