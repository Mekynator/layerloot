

# Product Catalog Workflow with Draft/Publish Architecture

## Current State
- Products table uses `is_active` boolean as only visibility control — changes are live immediately
- `AdminProducts.tsx` writes directly to the `products` table with no draft layer
- `use-storefront.ts` queries `products` with `.eq("is_active", true)` — no draft/published distinction
- No product revision history, no scheduled publishing, no product status system
- Variants (`product_variants`) also have no draft support

## Architecture Approach
Mirror the existing `site_blocks` draft pattern: add `draft_data` (jsonb), `has_draft`, `published_at`, `published_by`, `scheduled_publish_at`, and a `status` column to the `products` table. Admin reads draft_data when available; public storefront reads only the base columns when `status = 'published'`.

## Database Changes

### Migration: Extend `products` table for draft/publish

```sql
-- Add draft/publish columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS draft_data jsonb,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Index for scheduled publish job
CREATE INDEX IF NOT EXISTS idx_products_scheduled
  ON public.products (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;

-- Seed products.manage permission
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin', 'products.manage'),
  ('admin', 'products.manage'),
  ('editor', 'products.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin', 'products.publish'),
  ('admin', 'products.publish')
ON CONFLICT DO NOTHING;
```

`draft_data` stores a full snapshot of all editable product fields (name, description, price, images, stock, etc.) as a JSON object. When an admin edits a product, changes go into `draft_data` instead of the live columns. Publishing promotes `draft_data` values into the real columns and clears the draft.

`status` values: `draft` (never published), `published`, `unpublished`, `archived`, `scheduled`.

### Extend `process-scheduled-publish` edge function
Add a products query alongside the existing blocks/settings queries to auto-promote products whose `scheduled_publish_at <= now()`.

## New Files

### 1. `src/hooks/use-product-admin.ts`
Product admin hook providing:
- `loadAdminProduct(id)` — returns product with draft_data merged if present
- `saveDraftProduct(id, data, userId)` — writes to `draft_data`, sets `has_draft = true`
- `publishProduct(id, userId)` — promotes `draft_data` into live columns, logs revision, clears draft
- `unpublishProduct(id)` — sets `status = 'unpublished'`, `is_active = false`
- `archiveProduct(id)` — sets `status = 'archived'`, `archived_at`
- `scheduleProductPublish(id, date)` — sets `scheduled_publish_at`
- `loadProductRevisions(id)` — fetches from `content_revisions` where `content_type = 'product'`
- `restoreProductRevision(id, revisionNumber, asDraft)` — restores old version

### 2. `src/pages/admin/AdminProductPreview.tsx`
A route `/admin/products/:productId/preview` that renders a read-only product detail view using draft_data. Shows exactly how the product will appear on the storefront before publishing. Reuses existing `ProductDetail` rendering components but feeds them draft data.

## Modified Files

### `src/pages/admin/AdminProducts.tsx`
Major refactor:
- Replace direct `supabase.from("products").update()` with `saveDraftProduct()`
- Add status column in product table showing: Published, Draft, Unpublished, Archived, Scheduled
- Add status filter dropdown
- Replace "Active/Draft" toggle with proper status badges
- Add "Publish" / "Unpublish" / "Archive" action buttons per product
- Add "Preview" link → opens `AdminProductPreview`
- Add "History" button → opens `RevisionHistoryPanel` for product
- Add "Schedule" option on publish
- Add confirmation dialog for destructive actions (delete, archive, price changes)
- Show draft indicator when product has unpublished changes

### `src/hooks/use-storefront.ts`
Update public storefront queries:
- Change `.eq("is_active", true)` to `.eq("status", "published").eq("is_active", true)` so draft/unpublished/archived products never appear publicly
- Same for `useProductDetailQuery` — add status check

### `src/App.tsx`
- Add route: `/admin/products/:productId/preview` → `AdminProductPreview`

### `supabase/functions/process-scheduled-publish/index.ts`
- Add products scheduled publish processing alongside existing blocks/settings logic

## How Draft/Publish Works for Products

```text
Admin edits product
  → Changes saved to products.draft_data (JSON snapshot)
  → products.has_draft = true
  → Live storefront unchanged

Admin clicks "Preview"
  → AdminProductPreview reads draft_data
  → Renders product as it will appear

Admin clicks "Publish"
  → draft_data fields promoted to live columns (name, price, images, etc.)
  → Revision logged to content_revisions (content_type = 'product')
  → draft_data cleared, has_draft = false
  → products.published_at set
  → Live storefront now shows updated product

Admin clicks "Schedule"
  → scheduled_publish_at set
  → process-scheduled-publish edge function promotes at scheduled time
```

## Product Status Logic

| Status | `is_active` | `status` | Storefront visible |
|---|---|---|---|
| Published | true | published | Yes |
| Draft (new) | false | draft | No |
| Unpublished | false | unpublished | No |
| Archived | false | archived | No |
| Scheduled | true/false | scheduled | No (until publish time) |

## Revision History
Uses existing `content_revisions` table with `content_type = 'product'` and `content_id = product.id`. Each publish creates a revision snapshot. Rollback restores as draft for re-review.

## Permission Mapping
| Action | Permission |
|---|---|
| Edit product drafts | `products.manage` |
| Publish / unpublish products | `products.publish` |
| Archive / delete products | `products.publish` |
| View product admin | `products.manage` |

## Files Summary
| Action | File |
|---|---|
| Create | `src/hooks/use-product-admin.ts` |
| Create | `src/pages/admin/AdminProductPreview.tsx` |
| Modify | `src/pages/admin/AdminProducts.tsx` (draft workflow, status UI, actions) |
| Modify | `src/hooks/use-storefront.ts` (add status filter to public queries) |
| Modify | `src/App.tsx` (add preview route) |
| Modify | `supabase/functions/process-scheduled-publish/index.ts` (add products) |

## Database Changes Summary
- **Alter** `products`: +`draft_data`, +`has_draft`, +`published_at`, +`published_by`, +`updated_by`, +`scheduled_publish_at`, +`status`, +`archived_at`
- **Seed** `products.manage` and `products.publish` permissions

