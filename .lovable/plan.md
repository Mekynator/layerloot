

## Production-Ready Discount Engine Architecture

### Problem
The current system tries to store JSON objects into `scope_target_user_id` (UUID column), causing "invalid input syntax for type uuid". The `discount_rules` JSONB column was planned but never actually created (migration was empty comments). There's no `target_mode` column — just `scope` which mixes product/category/user/all targeting.

### Architecture

```text
discount_codes table:
├── target_mode TEXT (all | specific_user | specific_users | rules_based)
├── discount_rules JSONB (dynamic rules for rules_based mode)
├── scope_target_user_id UUID (single user only, for specific_user mode)
├── per_user_limit INT (max uses per individual user)
├── priority INT (for stacking precedence)
└── existing columns preserved
```

**No join table needed** — `specific_ids` inside `discount_rules` JSONB handles multi-user targeting cleanly (avoids extra table complexity for a feature that typically targets <100 users).

### Changes

#### 1. Database Migration
Add columns to `discount_codes`:
- `discount_rules JSONB DEFAULT NULL` — stores all rule-based targeting config
- `target_mode TEXT DEFAULT 'all'` — determines evaluation path
- `per_user_limit INT DEFAULT NULL` — per-user usage cap
- `priority INT DEFAULT 0` — stacking priority

Migrate existing data:
- Rows with `scope_target_user_id` set → `target_mode = 'specific_user'`
- All other rows → `target_mode = 'all'`

#### 2. Edge Function: `validate-discount-eligibility`
Complete rewrite with structured evaluation pipeline:

1. **Fetch discount** → validate exists + active
2. **Date check** → starts_at / expires_at
3. **Global usage** → max_uses vs used_count
4. **Per-user usage** → count from `orders` where discount was used (or a lightweight tracking approach via discount_rules metadata)
5. **Target mode routing**:
   - `all` → eligible
   - `specific_user` → match `scope_target_user_id`
   - `specific_users` → match against `discount_rules.specific_ids[]`
   - `rules_based` → evaluate each rule group with AND/OR logic
6. **Rules evaluation** (for `rules_based`):
   - `invited` → check `referral_invites` for `invited_user_id`
   - `new_registered` → user created within N days
   - `newcomer` → created within N days + optional zero-orders check
   - `min_points` → check `get_user_points_balance()`
   - `min_orders` → count completed orders
   - `achievement_keys` → check loyalty_points reasons or a future achievements table
   - `referral_requirements` → count successful referral invites
7. **Return** eligibility + discount details + debug reason

#### 3. Admin UI: `AdminDiscounts.tsx`
Refactor the save/load logic:

- Add `target_mode` selector: "All Users" | "Specific User" | "Multiple Users" | "Rules-Based"
- **Specific User**: single user picker → stores UUID in `scope_target_user_id`
- **Multiple Users**: multi-select picker → stores IDs in `discount_rules.specific_ids`
- **Rules-Based**: show rule builder with checkboxes/inputs for each group type
- **All**: no user targeting fields shown
- Remove the `audience_groups` approach — replace with cleaner `target_mode` routing
- Validation: prevent mixed payloads, require correct fields per mode
- Show matched user count estimate for rules-based targeting

#### 4. DiscountForm type update
```typescript
type TargetMode = "all" | "specific_user" | "specific_users" | "rules_based";

type DiscountForm = {
  // ...existing fields
  target_mode: TargetMode;
  scope_target_user_id: string | null;  // for specific_user
  rules: {
    specific_ids: string[];             // for specific_users
    groups: string[];                   // invited, new_registered, newcomer
    new_registered_days: number;
    newcomer_logic: "days" | "zero_orders";
    newcomer_days: number;
    min_points: number;
    min_orders: number;
    achievement_keys: string[];
    referral_requirements: {
      min_successful_invites: number;
      min_registered_invites: number;
    };
  };
};
```

### Files

| File | Action |
|------|--------|
| Migration SQL | Add `discount_rules`, `target_mode`, `per_user_limit`, `priority` columns + data migration |
| `supabase/functions/validate-discount-eligibility/index.ts` | Rewrite with structured evaluation pipeline and debug logging |
| `src/pages/admin/AdminDiscounts.tsx` | Refactor targeting UI with `target_mode` selector and clean payload routing |

### What stays unchanged
- All other discount fields (code, type, value, scope for product/category, dates, stackable, etc.)
- Rewards store tab
- Checkout savings hook
- Cart discount application logic (reads discount_type/value which don't change)

