

# Rewards Store, Vouchers & Discounts — Admin-Controlled Visual System

## Current State
- **Rewards catalog is 100% hardcoded** as `REWARD_CATALOG` array in `Account.tsx` (8 items: fixed discounts, gift card, free shipping, gift wrap)
- The `vouchers` DB table exists but only stores definitions matched by the hardcoded catalog during redemption
- Admin can manage `discount_codes` via `AdminDiscounts.tsx` but cannot manage reward catalog items
- No admin UI for voucher/reward tile styling, layout, or configuration
- No analytics for reward usage beyond basic voucher report in AdminReports

## Architecture Decision
Replace the hardcoded `REWARD_CATALOG` with DB-driven rewards from the existing `vouchers` table, and add a new `rewards_store_config` key in `site_settings` for visual/layout customization.

---

## Phase 1 — Dynamic Rewards Catalog + Admin Editor (this round)

### 1. Upgrade `vouchers` table schema
Add columns to support full admin control per reward:
- `badge_text` (text, nullable) — e.g. "Popular", "Best Value"
- `icon_key` (text, nullable) — Lucide icon name
- `image_url` (text, nullable) — optional card image
- `sort_order` (integer, default 0)
- `reward_type` (text, default 'fixed_discount') — enum-like: fixed_discount, percentage, gift_card, free_shipping, gift_wrap, custom
- `usage_limit_per_user` (integer, nullable)
- `global_usage_limit` (integer, nullable)
- `expiry_days` (integer, nullable) — days until voucher expires after redemption

### 2. Admin Rewards Manager page
New tab or section in AdminDiscounts (or separate page) with:
- CRUD for voucher/reward catalog items
- Editable fields: name, description, points_cost, discount_value, discount_type, reward_type, badge, icon, image, sort_order, active/inactive, usage limits, expiry
- Preview card showing how the reward tile will look
- Drag-to-reorder (up/down buttons)

### 3. Replace hardcoded `REWARD_CATALOG` in Account.tsx
- Fetch active vouchers from `vouchers` table instead of using the static array
- Render dynamically with all new fields (badge, icon, image, sort_order)
- Keep existing `redeemReward` logic but adapt to use DB voucher rows directly
- Remove the `REWARD_CATALOG` constant entirely

### 4. Rewards Store visual config (site_settings)
Store in `site_settings` key `rewards_store_config`:
```json
{
  "columns": 2,
  "layout": "grid",
  "title": "Rewards Store",
  "subtitle": "Redeem your points for exclusive rewards",
  "emptyStateText": "No rewards available right now.",
  "insufficientPointsText": "You need {needed} more points",
  "cardStyle": {
    "borderColor": "",
    "borderRadius": 12,
    "hoverAnimation": "lift",
    "showBadge": true,
    "ctaText": "Redeem"
  }
}
```
Add a "Rewards Store" sub-tab in AdminSettings (or AdminDiscounts) to edit these visual settings.

### 5. Redemption UX improvements
- Add confirmation dialog before redeem (with reward preview + points cost)
- Success animation (confetti-like pulse or checkmark)
- Toast notification on success/failure
- Show "You need X more points" on insufficient balance
- Points balance displayed prominently above reward grid

### 6. Basic analytics in admin
Add to AdminReports or as section in AdminDiscounts:
- Most redeemed rewards (by voucher name)
- Total points spent across all users
- Active vs used reward count
- Unused/expiring rewards count

---

## Technical Details

### Database migration
```sql
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS badge_text text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'fixed_discount',
  ADD COLUMN IF NOT EXISTS usage_limit_per_user integer,
  ADD COLUMN IF NOT EXISTS global_usage_limit integer,
  ADD COLUMN IF NOT EXISTS expiry_days integer;
```

### Files to create
| File | Purpose |
|---|---|
| `src/components/admin/RewardsStoreEditor.tsx` | Admin CRUD + visual config for reward catalog |

### Files to modify
| File | Change |
|---|---|
| `src/pages/Account.tsx` | Remove `REWARD_CATALOG`, fetch from `vouchers` table, use dynamic config from `site_settings` |
| `src/pages/admin/AdminDiscounts.tsx` | Add "Rewards" tab linking to RewardsStoreEditor |
| `src/pages/admin/AdminReports.tsx` | Add rewards analytics section |

### No new tables needed
- Uses existing `vouchers` table (extended with new columns)
- Uses existing `site_settings` for visual config
- Uses existing `user_vouchers` for redemption tracking

## Phase 2 (follow-up)
- Full tile visual customization (gradients, shadows, glow, animations per card)
- Gift card designer UI
- Integration with checkout savings panel
- Campaign/scheduling for rewards availability

