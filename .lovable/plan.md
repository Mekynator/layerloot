

# PDF Invoice / Factura System

## Architecture

An Edge Function (`generate-invoice`) generates a branded PDF using `jsPDF`, stores it in a new private `invoices` storage bucket, and saves metadata in a new `invoices` table. The stripe webhook triggers invoice generation after successful cart checkout.

## Database Changes

### New `invoices` table
```
id (uuid PK), order_id (uuid FK → orders, unique), invoice_number (text unique),
invoice_date (timestamptz), pdf_path (text), created_at (timestamptz)
```

### New `invoice_number_seq` sequence
Auto-incrementing sequence. Invoice numbers formatted as `LL-YYYY-XXXX` using `nextval`.

### New `invoices` storage bucket (private)
With RLS: owners can SELECT their own invoice files; admins can SELECT all.

### RLS on `invoices` table
- Users can SELECT where `order_id` matches an order they own
- Service role handles INSERT/UPDATE (via Edge Function)

## Edge Function: `generate-invoice`

**Input**: `{ order_id }` (called from stripe webhook or admin)

**Logic**:
1. Fetch order + order_items + profile + auth email + site_settings
2. Check if invoice already exists for this order — if so, delete old PDF (for regeneration)
3. Generate invoice number from sequence (`LL-2026-0001`)
4. Build PDF using `jsPDF` (imported from esm.sh):
   - White background, professional layout
   - Header: "⬡ LAYERLOOT" + company details
   - "INVOICE" title + invoice number, date, order number
   - Customer name + email + shipping address
   - Items table (product, qty, unit price, total)
   - Financial summary (subtotal, discount, shipping, tax, grand total)
   - Payment status
   - Footer with support email
5. Upload PDF to `invoices/{order_id}/invoice.pdf`
6. Upsert into `invoices` table
7. Return `{ invoice_url, invoice_number }`

## Trigger Integration

### Stripe webhook (`stripe-webhook/index.ts`)
After cart checkout success (where emails are already triggered):
- Call `generate-invoice` via `supabase.functions.invoke`
- Pass the generated `invoice_url` into the `order-receipt` email's `templateData`

### Receipt email template update
Add `invoiceDownloadUrl` prop to `order-receipt.tsx` so the "Download invoice" button links to the signed URL.

## Customer Account

### `OrdersModule.tsx`
Add a "Download Invoice" button per order that:
- Calls `generate-invoice` Edge Function (which returns existing or generates new)
- Opens the signed URL in a new tab

## Admin Panel

### `AdminOrderDetail.tsx`
- Show invoice number if exists
- Add "Download Invoice" button
- Add "Regenerate Invoice" button (calls `generate-invoice` with `regenerate: true`)

## Files Changed

| File | Action |
|---|---|
| `supabase/functions/generate-invoice/index.ts` | Create — PDF generator Edge Function |
| `supabase/functions/stripe-webhook/index.ts` | Update — trigger invoice generation after cart checkout |
| `supabase/functions/_shared/transactional-email-templates/order-receipt.tsx` | Update — add download invoice button |
| `src/components/account/OrdersModule.tsx` | Update — add download invoice button |
| `src/pages/admin/AdminOrderDetail.tsx` | Update — show invoice number + download/regenerate buttons |
| `supabase/config.toml` | Update — add generate-invoice function config |
| DB migration | Create `invoices` table, sequence, storage bucket, RLS policies |

