

# Redesign User Custom Order Page (Customer View)

## Current State
Custom orders are displayed inside `CustomOrdersModule.tsx` (269 lines) as expandable cards within the Account page. The current UX shows raw parsed fields, a flat message list, and basic badges. No progress timeline, no conversation state awareness, no media links support, and no "next steps" guidance.

## Plan

### 1. Rewrite `src/components/account/CustomOrdersModule.tsx`

**A. Order Header + Progress Timeline**
- Add a custom order timeline (similar to `OrderTimeline` but for custom order statuses):
  - Steps: Received → Reviewing → Quoted → In Production → Completed → Shipped
  - Map `order.status` + `order.production_status` to the correct step
  - Reuse the horizontal timeline pattern from `OrderTimeline.tsx` with the same glow/animation styling
- Show order type badge, status badge, and date in the header

**B. Request Details (clean version)**
- Reuse the `parseCustomOrderDescription` utility already in types.ts
- Render as clean label/value grid (material, color, quality, quantity, scale, customer notes)
- Remove raw `<pre>` block (line 164) — replace with formatted fields
- Add collapsible "Your Files / Attachments" section:
  - Show `model_filename` + link to `model_url`
  - Image preview from metadata `reference_image_url` if available
  - Collapsed by default using `Collapsible` component

**C. Quoting Section (prominent card)**
- Show quoted price, request fee status, final agreed price
- Display dynamic status messages: "Waiting for admin quote", "Quote available — action required", "Quote accepted", "In production"
- Keep Accept/Decline quote buttons (existing logic lines 205-213)
- Keep Pay Now flow (existing logic lines 224-238)
- Remove raw "Negotiation State" sub-section — replace with clean summary

**D. Communication (core redesign)**
- Chat-style layout with proper message bubbles:
  - Admin messages: right-aligned or left with branded avatar (Sparkles icon like admin page)
  - User messages: opposite side
  - System messages: centered, italic, muted
- Timestamps on each message
- Support media links in messages:
  - Detect video links (youtube, vimeo, or `📹` prefix from admin) → show "View Model Video" button
  - Detect image URLs → show inline preview thumbnail
- Respect conversation status:
  - If `metadata.conversation_status === "closed"`: disable input, show "Conversation closed" message
  - If open: show compose area with send button
- Auto-scroll to latest message

**E. "Next Steps" Guidance Banner**
- Dynamic contextual message based on order state:
  - `pending` + fee unpaid → "Pay the request fee to get started"
  - `pending`/`reviewing` → "Your request is being reviewed by our team"
  - `quoted` + pending response → "You have a quote waiting — review and accept"
  - `accepted` + awaiting_payment → "Complete payment to start production"
  - `in_production` → "Your order is being crafted"
  - `completed`/`shipped` → "Your order is on its way!"
- Styled as a highlighted info banner at the top of each expanded order

**F. Status Badges (simplified)**
- Show Order Status, Payment Status, Production Status as color-coded badges
- Use existing `customStatusBadgeColors` mapping

### 2. Files Changed

| File | Change |
|------|--------|
| `src/components/account/CustomOrdersModule.tsx` | Full redesign — timeline, clean details, chat UI, media support, conversation state, next-steps guidance |

### 3. No Database Changes
All needed fields (`metadata.conversation_status`, `metadata.video_link`, `metadata.picture_link`) are already stored as JSONB. Message detection for media links is done client-side by pattern matching.

### 4. Scope Boundaries
- **Included**: Timeline, clean details, chat redesign, media link support, conversation closed state, next-steps banner, collapsible attachments
- **Deferred**: Real-time updates (requires Supabase realtime subscription), email notifications for new messages, file upload in chat, AI chat assistance

