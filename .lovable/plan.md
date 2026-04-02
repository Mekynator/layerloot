

# Custom Order Automation System

## Current State
- Custom orders have manual status changes with basic system messages on status change and quote send
- `automation_workflows` table already exists for a general IF→THEN engine (used for storefront behavior automations)
- `AdminAutomations.tsx` is a placeholder page
- No SLA tracking, no reminders, no canned templates, no auto-close logic
- Notifications rely on `seenState` polling — no push/real-time notifications

## Approach
Build a **dedicated custom order automation layer** as a new database table + edge function + admin config UI, separate from the general `automation_workflows` (which handles storefront behavior). This keeps the system focused, configurable, and avoids overcomplicating the existing automation engine.

## Plan

### 1. Database Migration — New Tables

**A. `custom_order_automation_rules`** — configurable automation rules
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| trigger_event | text | e.g. `status_changed`, `quote_sent`, `no_customer_reply`, `production_update`, `conversation_closed` |
| trigger_config | jsonb | conditions like `{from_status, to_status, delay_days}` |
| actions | jsonb | array of actions: `[{type: "system_message", template: "..."}, {type: "notify_user"}, {type: "notify_admin"}]` |
| is_active | boolean | toggle on/off |
| sort_order | int | priority |
| name | text | display name |
| created_at / updated_at | timestamptz | |

RLS: admin-only CRUD, no public access.

**B. `custom_order_sla_tracking`** — deadline/SLA per order
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| custom_order_id | uuid FK | |
| stage | text | current stage being tracked |
| entered_at | timestamptz | when stage started |
| deadline_at | timestamptz | SLA deadline |
| resolved_at | timestamptz | when stage completed |
| sla_status | text | `on_track`, `warning`, `overdue` |

RLS: admin-only.

**C. `custom_order_message_templates`** — canned message templates
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| trigger_key | text | e.g. `status_reviewing`, `quote_sent`, `production_started` |
| title | text | display name |
| template | text | message body with `{{placeholders}}` |
| is_active | boolean | |
| sort_order | int | |

RLS: admin CRUD, authenticated read.

**D. Add `unread_by_admin` and `unread_by_user` columns to `custom_orders`**
- Boolean flags to track unread state for notification badges
- Updated by message insert logic

### 2. Edge Function — `process-custom-order-automations`

A scheduled edge function (pg_cron, every 5 min) that:
- Checks for time-based triggers: quote not responded in X days, order stuck in stage, auto-close after completion
- Executes actions: insert system messages, update unread flags, update SLA status
- Logs execution to `admin_activity_log`

### 3. Client-Side Automation Hook — `use-custom-order-automation.ts`

Runs **immediately** on status change / quote send (not waiting for cron):
- Looks up matching `custom_order_automation_rules` for the trigger event
- Executes instant actions: insert system message, set unread flags
- Called from `AdminCustomOrderDetail.tsx` after save/quote/production update

### 4. SLA Tracking Integration

**In `AdminCustomOrderDetail.tsx`:**
- Show SLA indicator card (green/yellow/red) based on `custom_order_sla_tracking`
- Show time-in-stage, total turnaround
- Auto-insert SLA row when stage changes

**In `AdminCustomOrders.tsx` list:**
- Add SLA status badge column (color dot)

### 5. Message Templates Admin UI

**New: `src/components/admin/CustomOrderTemplatesEditor.tsx`**
- CRUD for `custom_order_message_templates`
- Edit template text with placeholder support
- Preview rendered message

**In `AdminCustomOrderDetail.tsx`:**
- Add "Use template" dropdown in communication area
- Selecting a template pre-fills the message input

### 6. Automation Rules Admin UI

**New section in `AdminSettings.tsx` or dedicated tab:**
- List all `custom_order_automation_rules`
- Toggle active/inactive
- Edit trigger conditions and actions
- Configure SLA thresholds (e.g., warning at 48h, overdue at 72h)
- Configure auto-close delay
- Configure reminder delays

### 7. Unread/Notification Badges

**`AdminCustomOrders.tsx`:**
- Show unread dot on orders with `unread_by_admin = true`

**`CustomOrdersModule.tsx` (user side):**
- Show unread dot on orders with `unread_by_user = true`
- Clear unread when expanded

**Mark as read logic:**
- Admin views order → set `unread_by_admin = false`
- User expands order → set `unread_by_user = false`

### 8. Auto-Close Conversation

- Add rule: when status = `completed` or `cancelled` AND no messages for X days → auto-close
- Handled by the scheduled edge function
- Inserts system message "Conversation automatically closed"

### 9. Seed Default Rules & Templates

Insert default automation rules and message templates via the migration:
- Status → Reviewing: "Your request is now under review."
- Status → Quoted: "A quote is now available for your custom order."
- Quote accepted: "Quote accepted — preparing for production."
- Production started: "Your order is now in production."
- Shipped: "Your order has been shipped!"
- Completed: "Your order is complete."
- Reminder: quote not responded in 3 days

### Files Changed

| File | Change |
|------|--------|
| **Migration** | Create 3 new tables + add 2 columns to `custom_orders` + seed defaults |
| `supabase/functions/process-custom-order-automations/index.ts` | **New** — scheduled cron function |
| `src/hooks/use-custom-order-automation.ts` | **New** — instant trigger execution |
| `src/components/admin/CustomOrderTemplatesEditor.tsx` | **New** — template CRUD |
| `src/pages/admin/AdminCustomOrderDetail.tsx` | Add SLA card, template dropdown, call automation hook on save |
| `src/pages/admin/AdminCustomOrders.tsx` | Add unread badge, SLA column |
| `src/components/account/CustomOrdersModule.tsx` | Unread clearing, improved notification dots |
| `src/pages/admin/AdminSettings.tsx` | Add automation rules config section |

### Scope Boundaries
- **Included**: Automation rules engine, SLA tracking, message templates, unread badges, auto-system-messages, auto-close, scheduled reminders, admin config UI
- **Deferred**: Email notifications (future phase using existing email infra), real-time subscriptions, AI-powered suggestions

