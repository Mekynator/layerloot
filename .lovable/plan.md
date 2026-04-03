

# Default Professional Email Templates

## Current State
- `TEMPLATE_DEFAULTS` in `types.ts` has 12 template definitions but they are incomplete — missing subtitles, secondary CTAs, and the full professional content requested
- The DB table `custom_order_message_templates` has 8 rows for custom-order workflow messages (status_reviewing, status_quoted, etc.) — these are NOT the general email templates
- The table lacks an `extended_config` column needed to persist design/styling fields
- The `AdminEmailManager` only loads from DB — so the 12 default templates from `TEMPLATE_DEFAULTS` never appear in the UI
- Preview placeholder map in `EmailLivePreview` is missing several placeholders (shipping_address, billing_address, tracking_url, etc.)

## Plan

### 1. Database migration
- Add `extended_config TEXT` column to `custom_order_message_templates` to persist all extra template fields (subject, preheader, colors, images, etc.)

### 2. Update `TEMPLATE_DEFAULTS` with full professional content
Rewrite all 12 templates in `types.ts` with the complete content from the request — proper subjects, preheaders, titles, subtitles, full bodies, highlight boxes, primary + secondary CTAs, support blocks, and correct trigger keys. Add the missing `admin-notification` template (13 total).

### 3. Update `AdminEmailManager` to show defaults alongside DB templates
- After loading DB templates, merge in any `TEMPLATE_DEFAULTS` entries that don't have a matching `trigger_key` in the DB — displayed as "Default" templates
- When user clicks Save on a default template, insert a new DB row (upsert logic)
- This means all 13 templates appear immediately without needing DB seeds

### 4. Update `EmailLivePreview` placeholder map
Add missing preview values: `{{shipping_address}}`, `{{billing_address}}`, `{{tracking_url}}`, `{{custom_request_summary}}`, `{{uploaded_files}}`, `{{customer_note}}`, `{{custom_order_status}}`, `{{custom_order_link}}`, `{{review_notes}}`, `{{ticket_status}}`, `{{ticket_url}}`, `{{discount_code}}`, `{{vat_number}}`, `{{invoice_download_url}}`, `{{order_items_table}}`, `{{login_url}}`, `{{reset_url}}`, `{{verification_url}}`, `{{admin_name}}`, `{{loyalty_points}}`

### 5. Update `TemplateEditorModal` — sync initial state on prop change
Add `useEffect` to reset local state when `initial` template changes (currently stale if user clicks a different template without closing).

### Files changed
| File | Change |
|---|---|
| `src/components/admin/email/types.ts` | Full rewrite of all 13 TEMPLATE_DEFAULTS with professional content |
| `src/components/admin/email/AdminEmailManager.tsx` | Merge defaults into template list, upsert on save |
| `src/components/admin/email/EmailLivePreview.tsx` | Add ~20 missing placeholder preview values |
| `src/components/admin/email/TemplateEditorModal.tsx` | Sync state on prop change |
| DB migration | Add `extended_config` column |

### No new files needed
Everything builds on the existing email manager components.

