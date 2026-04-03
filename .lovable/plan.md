

# Email Automation & Sending System

## Current State — What Already Exists

The project has a **nearly complete** email infrastructure:

- **Queue system**: `process-email-queue` Edge Function with pgmq, retry logic (5 attempts), TTL, rate-limit handling, DLQ — fully production-grade
- **Auth emails**: `auth-email-hook` receives Supabase auth events, renders React Email templates, enqueues to `auth_emails` queue
- **Transactional emails**: `send-transactional-email` loads templates from a React registry, renders, enqueues to `transactional_emails` queue
- **DB tables**: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` — all in place
- **Contact auto-reply**: Already wired in `Contact.tsx` → calls `send-transactional-email`

### What's Missing

1. **Stripe webhook doesn't send emails** — `checkout.session.completed` updates DB status but never triggers order confirmation, receipt, or payment confirmation emails
2. **Custom order flow doesn't send emails** — request fee payment, quote sent, custom order paid have no email triggers
3. **No Admin Email Logs page** — the `email_send_log` table exists but has no UI
4. **`contact-send` is a stub** — just logs, doesn't forward to admin or do anything useful
5. **New template types** (quote-sent, payment-confirmation, shipping-update, delivered, gift-card, admin-notification) exist in defaults but have no corresponding React Email components in the Edge Function registry
6. **No "test send" from admin** — template editor has no test email capability

### Important: No SMTP/IONOS Integration Needed

The project uses **Lovable Email** infrastructure (via `@lovable.dev/email-js`) with the `notify.layerloot.neuraltune.me` subdomain. This is the correct production setup. IONOS is only for the reply-to mailbox. No SMTP configuration is needed.

---

## Plan

### 1. Add missing transactional email templates to the Edge Function registry

Create React Email components for: `quote-sent`, `payment-confirmation`, `shipping-update`, `delivered`, `gift-card`, `admin-notification`. Register them in `registry.ts`.

**Files**: 6 new files in `supabase/functions/_shared/transactional-email-templates/`, update `registry.ts`

### 2. Wire email triggers into `stripe-webhook`

After `checkout.session.completed`:
- **Cart checkout**: Call `send-transactional-email` to send `order-confirmation` + `order-receipt`
- **Request fee paid**: Send `custom-order-confirmation`
- **Custom order final payment**: Send `payment-confirmation`

This requires adding a helper in the stripe webhook to invoke `send-transactional-email` internally (via Supabase service client calling the Edge Function, or by directly enqueuing via `supabase.rpc('enqueue_email')`). Direct enqueue is preferred — avoids an extra Edge Function call.

**File**: `supabase/functions/stripe-webhook/index.ts`

### 3. Wire email triggers for admin actions

Create a small utility Edge Function `trigger-email` that admin-side code can call for:
- **Quote sent** → when admin sends a quote on a custom order
- **Shipping update** → when admin marks order as shipped
- **Delivered** → when admin marks order as delivered

These will be called from existing admin UI actions (custom order detail page, order detail page).

**Files**: New `supabase/functions/trigger-email/index.ts`, updates to `src/pages/admin/AdminCustomOrderDetail.tsx` and `src/pages/admin/AdminOrderDetail.tsx`

### 4. Create Admin Email Logs page

New page at `/admin/email-logs` showing:
- Table with: template, recipient, status, date, error message
- Filters by status (sent/failed/pending/dlq/suppressed) and template
- Retry button for failed emails
- Reads from `email_send_log` table

**Files**: New `src/pages/admin/AdminEmailLogs.tsx`, update `src/App.tsx` (route), update `src/components/admin/AdminLayout.tsx` (sidebar link)

### 5. Add "Send Test Email" to template editor

Add a button in `TemplateEditorModal` that calls `send-transactional-email` with the current template's trigger key and mock data, sending to the admin's own email.

**File**: Update `src/components/admin/email/TemplateEditorModal.tsx`

### 6. Upgrade `contact-send` to forward to admin

Update `contact-send` to also send an `admin-notification` email to the configured `CONTACT_TO_EMAIL` with the ticket details.

**File**: `supabase/functions/contact-send/index.ts`

### 7. Redeploy all changed Edge Functions

Deploy: `stripe-webhook`, `contact-send`, `send-transactional-email`, `trigger-email`, and all template changes.

---

## Files Changed Summary

| File | Action |
|---|---|
| `supabase/functions/_shared/transactional-email-templates/quote-sent.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/payment-confirmation.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/shipping-update.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/delivered.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/gift-card.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/admin-notification.tsx` | Create |
| `supabase/functions/_shared/transactional-email-templates/registry.ts` | Update (add 6 templates) |
| `supabase/functions/stripe-webhook/index.ts` | Update (add email enqueue after payment) |
| `supabase/functions/contact-send/index.ts` | Update (forward to admin) |
| `supabase/functions/trigger-email/index.ts` | Create (admin-triggered emails) |
| `src/pages/admin/AdminEmailLogs.tsx` | Create |
| `src/App.tsx` | Update (add route) |
| `src/components/admin/AdminLayout.tsx` | Update (add sidebar link) |
| `src/components/admin/email/TemplateEditorModal.tsx` | Update (test send button) |
| `src/pages/admin/AdminOrderDetail.tsx` | Update (trigger shipping/delivered emails) |
| `src/pages/admin/AdminCustomOrderDetail.tsx` | Update (trigger quote email) |

### No database changes needed
The existing `email_send_log`, `email_send_state`, and queue infrastructure are sufficient.

### No SMTP setup needed
Lovable Email handles all sending via the verified `notify.layerloot.neuraltune.me` domain.

