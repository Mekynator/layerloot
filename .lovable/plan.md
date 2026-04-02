

# Automation Engine — IF → THEN Workflow System

## Overview

Build an event-driven automation engine that lets admins create visual IF → THEN workflows. Workflows are stored in the database, evaluated client-side against real-time events, and execute UI/chat/campaign actions without page reload.

## Architecture

```text
┌─────────────────────────────────────┐
│  Database: automation_workflows     │
│  (trigger, conditions, actions,     │
│   priority, cooldown, enabled)      │
├─────────────────────────────────────┤
│  Database: automation_logs          │
│  (workflow_id, session, timestamp,  │
│   trigger_event, actions_executed)  │
├─────────────────────────────────────┤
│  useAutomationEngine (hook)         │
│  ├─ Fetches active workflows        │
│  ├─ Listens to events from          │
│  │   EventBus (custom events)       │
│  ├─ Evaluates conditions            │
│  ├─ Executes actions                │
│  └─ Respects cooldowns/priority     │
├─────────────────────────────────────┤
│  AutomationEventBus (context)       │
│  ├─ emit("cart_add", data)          │
│  ├─ emit("page_view", data)         │
│  ├─ emit("user_idle", data)         │
│  └─ … from CartContext, ChatWidget, │
│       Layout, behavior tracking     │
├─────────────────────────────────────┤
│  Admin: AutomationBuilder page      │
│  ├─ Workflow list + create/edit     │
│  ├─ Trigger selector                │
│  ├─ Condition builder (AND/OR)      │
│  ├─ Action chain builder            │
│  ├─ Priority/cooldown settings      │
│  └─ Execution logs viewer           │
└─────────────────────────────────────┘
```

## Database Changes (2 new tables)

### `automation_workflows`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Workflow name |
| description | text | |
| is_active | boolean | Enable/disable |
| priority | int | Higher = evaluated first |
| trigger_event | text | e.g. `page_view`, `cart_add`, `user_idle` |
| trigger_config | jsonb | Event-specific params (page, product, seconds) |
| conditions | jsonb | Array of `{field, op, value, logic}` |
| actions | jsonb | Array of `{type, config}` |
| cooldown_seconds | int | Per-session cooldown |
| max_fires_per_session | int | Limit repeated firing |
| campaign_id | uuid nullable | Scope to campaign |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

RLS: Admin full CRUD. No public access.

### `automation_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workflow_id | uuid | |
| session_id | text | |
| user_id | uuid nullable | |
| trigger_event | text | |
| actions_executed | jsonb | |
| page | text | |
| created_at | timestamptz | |

RLS: Admin read. Anon/auth insert.

## Implementation Steps

### Step 1: Database migration
Create both tables with RLS policies (admin manage, anon/auth insert for logs).

### Step 2: Event Bus (`src/contexts/AutomationContext.tsx`)
- Create `AutomationEventBus` context with `emit(event, data)` and `useAutomationEvent()` hook
- Wrap app in provider (inside existing providers in App.tsx)
- Supported events: `page_view`, `product_view`, `cart_add`, `cart_remove`, `checkout_start`, `user_idle`, `user_login`, `user_register`, `chat_open`, `chat_message`, `scroll_percent`, `campaign_active`

### Step 3: Automation Engine hook (`src/hooks/use-automation-engine.ts`)
- Fetches active workflows from `automation_workflows` ordered by priority
- Subscribes to EventBus events
- On each event: finds matching workflows → evaluates conditions (AND/OR) → executes actions in sequence
- Tracks cooldowns in session memory (Map of workflow_id → last fired timestamp)
- Logs executions to `automation_logs` (fire-and-forget)

### Step 4: Action executors
Built into the engine hook, each action type maps to a function:
- `show_toast` → call `toast()` from sonner
- `open_chat` → dispatch custom DOM event that ChatWidget listens to
- `show_popup` → set state in AutomationContext consumed by a global `<AutomationOverlay>` component
- `navigate` → use `window.location` or router
- `apply_theme` → dispatch event to CampaignThemeProvider
- `suggest_products` → inject into chat context
- `show_banner` → rendered by AutomationOverlay
- `highlight_element` → add CSS class via DOM query

### Step 5: Event emitters in existing code
Add `emit()` calls to:
- `CartContext.tsx` → `cart_add`, `cart_remove`
- `Layout.tsx` → `page_view` (on route change)
- `AuthContext.tsx` → `user_login`, `user_register`
- `ChatWidget.tsx` → `chat_open`, `chat_message`
- Idle timer in AutomationContext → `user_idle`

### Step 6: Admin page (`src/pages/admin/AdminAutomations.tsx`)
Tabs:
- **Workflows**: List all workflows with enable/disable toggle, priority, duplicate, delete. Click to edit.
- **Builder**: Form-based workflow editor with trigger dropdown, condition rows (field + operator + value + AND/OR), action rows (type + config), priority/cooldown fields.
- **Logs**: Table of recent executions with filters (workflow, date, page). Shows trigger, conditions matched, actions fired.
- **Templates**: Pre-built workflow templates (cart abandonment, idle chat, voucher reminder, campaign activation) that can be cloned.

### Step 7: AutomationOverlay component
Small component in `App.tsx` that renders popups/banners/notifications triggered by the engine. Consumes automation state from context.

### Step 8: Route & sidebar
- Add `/admin/automations` route in App.tsx
- Add "Automations" link to admin sidebar under Tools group

## Trigger Types Reference
| Trigger | Config |
|---------|--------|
| `page_view` | `{page: string}` |
| `product_view` | `{productId?: string, categoryId?: string}` |
| `cart_add` | `{productId?: string}` |
| `cart_remove` | `{}` |
| `checkout_start` | `{}` |
| `user_idle` | `{seconds: number}` |
| `user_login` | `{}` |
| `scroll_percent` | `{threshold: number}` |
| `campaign_active` | `{campaignId: string}` |
| `chat_open` | `{}` |
| `time_on_page` | `{seconds: number}` |

## Condition Fields
`user.logged_in`, `user.points`, `user.has_vouchers`, `cart.item_count`, `cart.total`, `page.path`, `campaign.active`, `campaign.id`, `time.hour`, `session.visit_count`

## Safety
- Cooldown tracking per workflow per session (in-memory Map)
- `max_fires_per_session` default 1
- No recursive triggers (actions don't re-emit events)
- Async non-blocking execution
- Logs capped at 10k rows (cleanup query in admin)

## Files to Create/Modify
| File | Action |
|------|--------|
| Migration SQL | 2 new tables |
| `src/contexts/AutomationContext.tsx` | New — event bus + overlay state |
| `src/hooks/use-automation-engine.ts` | New — workflow evaluation engine |
| `src/pages/admin/AdminAutomations.tsx` | New — admin builder + logs |
| `src/components/AutomationOverlay.tsx` | New — renders dynamic popups/banners |
| `src/App.tsx` | Add provider, route, overlay |
| `src/contexts/CartContext.tsx` | Add emit calls |
| `src/components/layout/Layout.tsx` | Add page_view emit |
| `src/contexts/AuthContext.tsx` | Add login/register emit |
| `src/components/ChatWidget.tsx` | Add chat event emit |
| `src/components/admin/AdminLayout.tsx` | Add sidebar link |

