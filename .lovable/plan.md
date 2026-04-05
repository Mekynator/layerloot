

## Phase 2: Referral System Backend Hardening

### Current State

The foundation already exists:
- **`referral_invites` table** with `invite_code`, `inviter_user_id`, `invited_user_id`, `status`, point-granted flags, indexes, and unique constraint on `invite_code`
- **`process-referral-rewards` edge function** handling invite linking (by code and email) and order-based reward granting with idempotent point flags
- **RLS policies** for users, admins, and service role
- **Frontend hooks** (`use-referrals.ts`) and UI (`ReferralModule.tsx`)
- **Auth integration** capturing `ref` param and invoking the edge function on sign-in
- **Stripe webhook** handling cart checkout but NOT triggering referral rewards on order completion

### What Needs To Be Done

#### 1. Database Migration — Extend Schema

Add missing columns and hardening to `referral_invites`:
- `inviter_points_amount INT NOT NULL DEFAULT 25`
- `invited_points_amount INT NOT NULL DEFAULT 15`
- `reward_granted_at TIMESTAMPTZ`
- `notes TEXT`
- `metadata JSONB DEFAULT '{}'`
- Index on `status`
- Index on `invited_email`

Add `referred_by_invite_id` to `profiles`:
- `referred_by_invite_id UUID REFERENCES referral_invites(id) ON DELETE SET NULL`

Add a **trigger** on `referral_invites` to auto-set `updated_at`.

#### 2. RLS Policy Hardening

Tighten the existing `"Users update own invites"` policy to prevent users from modifying reward fields:
- Drop the current UPDATE policy for authenticated users
- Create a new restricted UPDATE policy that only allows updating non-sensitive fields (`invited_email`, `notes`) where `inviter_user_id = auth.uid()`
- All reward-related updates (status, points_granted, invited_user_id) remain service-role only

#### 3. Edge Function — Harden `process-referral-rewards`

Update the existing function with:
- **Input validation** using manual checks (ref_code format, UUID format for user_id/order_id)
- **Idempotency** — before inserting loyalty points, check if a point row with the same reason pattern and order_id already exists
- **Set `reward_granted_at`** when both point flags become true
- **Set `profiles.referred_by_invite_id`** when linking an invited user
- **Exclude invalid order statuses** — keep existing `VALID_ORDER_STATUSES` but explicitly reject `cancelled`, `refunded`, `failed`
- **Return structured response** with details of what was processed

#### 4. Stripe Webhook — Trigger Referral Rewards on Order Completion

In `stripe-webhook/index.ts`, after a successful cart checkout (`source === "cart"`):
- Extract `user_id` from session metadata (must be passed from `create-checkout`)
- Call `process-referral-rewards` with `{ order_id, user_id }` via internal function invoke
- This ensures referral rewards trigger automatically on paid orders

Also update `create-checkout` to include `user_id` in Stripe session metadata if not already present.

#### 5. Discount Engine — Backend Targeting for Invited Users

The `AdminDiscounts.tsx` currently stores audience config as JSON in `scope_target_user_id`. The backend validation at checkout needs to evaluate this:

Create a new edge function `validate-discount-eligibility`:
- Accepts `{ discount_code, user_id }`
- Parses the audience JSON config from `discount_codes.scope_target_user_id`
- Evaluates group membership:
  - **invited**: check `referral_invites` for `invited_user_id = user_id`
  - **new_registered**: check `auth.users.created_at` within configured days
  - **newcomer**: check order count = 0 or created within X days
  - **specific**: check user_id in the specific_ids list
  - **all_existing**: always true for authenticated users
- Returns `{ eligible: boolean, discount_value, discount_type }`

#### 6. Achievement Counters — Database View

Create a SQL view `referral_user_stats` for efficient dashboard queries:
```sql
CREATE VIEW referral_user_stats AS
SELECT
  inviter_user_id,
  COUNT(*) FILTER (WHERE invited_email IS NOT NULL OR invited_user_id IS NOT NULL) AS total_invited,
  COUNT(*) FILTER (WHERE status IN ('registered','ordered')) AS accounts_created,
  COUNT(*) FILTER (WHERE status = 'ordered') AS first_orders,
  COALESCE(SUM(inviter_points_amount) FILTER (WHERE inviter_points_granted), 0) AS points_earned
FROM referral_invites
GROUP BY inviter_user_id;
```

#### 7. Admin Reporting — Aggregate View

Create `referral_admin_summary` view for admin dashboard:
```sql
CREATE VIEW referral_admin_summary AS
SELECT
  COUNT(*) AS total_invites,
  COUNT(*) FILTER (WHERE status != 'pending') AS accepted,
  COUNT(*) FILTER (WHERE status = 'ordered') AS first_orders,
  SUM(CASE WHEN inviter_points_granted THEN inviter_points_amount ELSE 0 END) AS total_inviter_points,
  SUM(CASE WHEN invited_points_granted THEN invited_points_amount ELSE 0 END) AS total_invited_points
FROM referral_invites;
```

#### 8. Update Frontend Hook

Update `use-referrals.ts` to use the new `inviter_points_amount` column instead of hardcoded `* 25` calculation.

### Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/...` | New migration with schema changes, views, trigger, policy updates |
| `supabase/functions/process-referral-rewards/index.ts` | Harden with validation, idempotency, profile linking |
| `supabase/functions/stripe-webhook/index.ts` | Add referral reward trigger after cart checkout |
| `supabase/functions/validate-discount-eligibility/index.ts` | New function for backend discount targeting |
| `src/hooks/use-referrals.ts` | Use dynamic point amounts from DB |

### Technical Decisions

- Views instead of materialized views — data is small enough for live queries
- No profile `is_invited_user` column — derivable from `referred_by_invite_id IS NOT NULL`
- Reward idempotency via both boolean flags AND duplicate loyalty_points check
- Discount validation as separate edge function for reuse from checkout and cart

