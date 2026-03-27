

# Implementation Plan

This plan covers four areas: (1) adding missing DB columns for the custom order request-fee flow, (2) fixing custom order visibility so orders appear only after the 100 kr fee is paid, (3) ensuring the quote-accept-pay flow works end-to-end, and (4) converting the chat bot from a regex-based rule engine to an AI-powered conversational assistant using Lovable AI.

---

## 1. Database Migration: Add Missing Custom Order Columns

The `custom_orders` table is missing columns referenced by edge functions and frontend code.

**Add columns via migration:**
- `request_fee_amount` (numeric, default 100)
- `request_fee_status` (text, default `'unpaid'`)
- `stripe_checkout_session_id` (text, nullable)
- `metadata` (jsonb, default `'{}'`)

This unblocks `create-request-fee-checkout` and `create-custom-order-checkout` which query these columns.

---

## 2. Custom Order Visibility: Only Show After Fee Paid

**Frontend (`use-account-overview.ts`):**
- The query already fetches all custom orders for the user. Add a filter in the Account page to split orders into two groups:
  - **Pending fee**: status = `awaiting_request_fee` or `payment_pending` with `request_fee_status != 'paid'` — show a "Pay Request Fee" prompt
  - **Active orders**: `request_fee_status = 'paid'` — show full details, messaging, quote actions

**Admin side:** Admins already see all orders via RLS `has_role(admin)`. Add a visual indicator showing whether the request fee has been paid so admins know which orders to quote.

**Edge function fixes:**
- `create-request-fee-checkout`: Currency should be `dkk` (currently `sek`)
- `stripe-webhook`: Handle `request_fee` metadata type — update `request_fee_status` to `'paid'` and `status` to `'pending'` (ready for admin review)

---

## 3. Quote Accept → Payment Flow

The existing flow mostly works but needs these fixes:

**`respondToQuote` in Account.tsx** (accept path):
- Currently calls `payCustomOrder()` which invokes `create-custom-order-checkout`
- The checkout function correctly reads `final_agreed_price ?? quoted_price`, deducts the request fee, and creates a Stripe session
- Fix: When user accepts, update `customer_response_status` to `'accepted'` AND set `final_agreed_price = quoted_price` (if not already set), then redirect to payment

**`stripe-webhook`**: Handle `custom_order_final` payment type:
- Set `payment_status = 'paid'`, `status = 'paid'`, `production_status = 'queued'`

---

## 4. AI Chat Bot: Convert to Lovable AI Powered

Currently the chat function uses regex matching (`/points|loyalty/i.test(...)`) and returns hardcoded responses. This will be replaced with an AI-powered conversation that has full context.

**Backend (`supabase/functions/chat/index.ts`):**
- Keep all existing data-fetching functions (`tryProfile`, `tryPoints`, `tryOrders`, `tryProductViews`, `tryRecommendedProducts`)
- Gather additional context: categories list, shipping config, site navigation links, custom orders summary
- Build a rich system prompt containing:
  - User account info (name, email, points, orders, custom orders)
  - Cart state and free shipping progress
  - Product catalog summary and categories
  - Site navigation map (pages and their URLs)
  - Store policies (shipping, returns, custom print process)
  - Instructions to provide links when users ask "where is X"
- Send full conversation history + system prompt to Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY`
- Use `google/gemini-3-flash-preview` model for fast responses
- Stream the response back to the frontend
- Parse AI response to extract structured data (links, product recommendations) when relevant

**Frontend (`ChatWidget.tsx`):**
- Update to handle streaming SSE responses from the new AI-powered chat
- Add markdown rendering for AI responses using `react-markdown`
- Keep all existing UI: suggestion chips, product cards, order cards, points display
- The AI will return structured JSON with `text` + optional `links`, `products`, `suggestions` fields
- Keep the existing `AssistantExtras` component for rich cards

**System prompt will include:**
- Full site map: Home (`/`), Products (`/products`), Create Your Own (`/create`), Gallery (`/gallery`), Contact (`/contact`), Account (`/account`), Cart (`/cart`), Auth (`/auth`)
- User's current page for contextual help
- Instructions to always provide clickable links when users ask navigation questions
- Knowledge about materials (PLA, PETG, Resin, etc.), print qualities, custom order process
- Tone: friendly, helpful, concise

---

## Technical Details

**Files to modify:**
1. **Database migration** — Add 4 columns to `custom_orders`
2. **`supabase/functions/chat/index.ts`** — Rewrite to use Lovable AI with context injection, streaming
3. **`supabase/functions/stripe-webhook/index.ts`** — Handle `request_fee` and `custom_order_final` payment types
4. **`supabase/functions/create-request-fee-checkout/index.ts`** — Fix currency to DKK
5. **`src/components/ChatWidget.tsx`** — Add SSE streaming, markdown rendering, keep existing rich UI cards
6. **`src/pages/Account.tsx`** — Filter custom orders by fee payment status, show "Pay Fee" for unpaid ones
7. **`src/hooks/use-account-overview.ts`** — No changes needed (already fetches `*`)
8. **`src/pages/admin/AdminCustomOrders.tsx`** — Add request fee status indicator

**Dependencies to add:** `react-markdown` for chat message rendering

