

# AI Chat Analytics, Training & Optimization Dashboard

## Overview

Build a comprehensive analytics, training, and optimization system for the AI chat, adding database tables for conversation tracking, a Q&A knowledge base, and a multi-tab admin dashboard.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  ChatWidget (frontend)                          │
│  ├─ Tracks: session start, messages, clicks     │
│  └─ Sends events → chat_analytics table         │
├─────────────────────────────────────────────────┤
│  chat edge function                             │
│  ├─ Fetches Q&A knowledge base for system prompt│
│  └─ Logs conversations → chat_conversations     │
├─────────────────────────────────────────────────┤
│  AdminChatAnalytics page (new)                  │
│  ├─ Analytics Dashboard tab                     │
│  ├─ Conversation Logs tab                       │
│  ├─ Knowledge Base / Training tab               │
│  ├─ Performance Health tab                      │
│  └─ Testing Sandbox tab                         │
└─────────────────────────────────────────────────┘
```

## Database Changes (3 new tables)

### 1. `chat_conversations`
Stores every AI chat session with messages and metadata for admin review.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| session_id | text | Client-generated session ID |
| user_id | uuid nullable | Logged-in user |
| messages | jsonb | Full message array |
| page | text | Page where chat started |
| campaign_id | text nullable | Active campaign |
| language | text | User language |
| started_at | timestamptz | Session start |
| ended_at | timestamptz nullable | Session end |
| message_count | int | Total messages |
| outcome | text | 'converted', 'abandoned', 'resolved', 'unknown' |
| metadata | jsonb | Cart snapshot, quick replies clicked, products viewed |
| admin_flags | jsonb | Flagged, useful/not useful markers |
| created_at | timestamptz | |

RLS: Admins full access. Service role insert. No public read.

### 2. `chat_analytics_events`
Lightweight event tracking for aggregation.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| session_id | text | Links to conversation |
| event_type | text | 'open', 'message', 'quick_reply_click', 'product_click', 'conversion', 'close' |
| event_data | jsonb | Event-specific payload |
| page | text | |
| campaign_id | text nullable | |
| user_id | uuid nullable | |
| created_at | timestamptz | |

RLS: Admins read. Service role insert.

### 3. `chat_knowledge_base`
Q&A pairs for AI training / preferred responses.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| question | text | Pattern/question |
| answer | text | Preferred response |
| category | text | 'products', 'shipping', 'materials', 'custom_orders', 'rewards', 'general' |
| is_active | boolean | |
| priority | int | Higher = used first |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

RLS: Admins full CRUD. Public read active entries (for edge function).

## Implementation Steps

### Step 1: Database migration
Create all 3 tables with RLS policies.

### Step 2: Frontend event tracking (`ChatWidget.tsx`)
- On chat open: insert `open` event
- On message send: insert `message` event
- On quick reply click: insert `quick_reply_click` event
- On product link click in AI response: insert `product_click` event
- On session end (close/navigate away): upsert conversation record with full messages
- Use `navigator.sendBeacon` or fire-and-forget fetch for non-blocking tracking

### Step 3: Edge function updates (`chat/index.ts`)
- Fetch active `chat_knowledge_base` entries and inject into system prompt as a "Preferred Q&A" section
- Log conversation to `chat_conversations` table after generating response (fire-and-forget)

### Step 4: Admin Analytics Dashboard page
New page: `src/pages/admin/AdminChatAnalytics.tsx` with tabs:

**Tab 1 — Dashboard**: Stat tiles (total chats, unique users, conversion rate, avg messages), charts (chats over time, top pages, top questions), quick reply performance table, product recommendation clicks.

**Tab 2 — Conversations**: Searchable/filterable table of all conversations. Click to expand full chat log. Filters: date range, page, user, campaign, outcome. Flag/mark useful buttons.

**Tab 3 — Knowledge Base (Training)**: CRUD interface for Q&A pairs. Categories, priority sorting, active toggle. Bulk import. "Add from conversation" quick action.

**Tab 4 — Health & Insights**: Health score cards (engagement, conversion, response quality). Alert cards for issues (high abandonment, unanswered questions). Top unanswered questions list.

**Tab 5 — Testing Sandbox**: Embedded chat preview. Page/campaign/tone selector. Test conversations without affecting analytics. Uses same edge function with `test_mode` flag.

### Step 5: Route registration
Add `/admin/chat-analytics` route in `App.tsx` with admin guard.

### Step 6: Sidebar navigation
Add "AI Analytics" link to admin sidebar.

## Technical Details

- Analytics queries use `supabase.from("chat_analytics_events")` with date filtering and `.select()` aggregations
- Conversation logging from ChatWidget uses the anon key (insert-only RLS)
- Knowledge base entries are fetched in the edge function alongside existing chat config
- Health scores are computed client-side from event aggregates (no extra DB functions needed)
- Testing sandbox reuses the existing ChatWidget component with a `sandboxMode` prop that skips analytics logging

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create 3 tables |
| `src/pages/admin/AdminChatAnalytics.tsx` | New — full dashboard |
| `src/components/ChatWidget.tsx` | Add event tracking |
| `supabase/functions/chat/index.ts` | Add knowledge base fetch, conversation logging |
| `src/App.tsx` | Add route |
| `src/components/admin/AdminLayout.tsx` | Add sidebar link |

