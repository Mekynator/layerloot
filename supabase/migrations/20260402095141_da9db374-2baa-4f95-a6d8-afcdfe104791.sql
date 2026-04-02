
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS draft_data jsonb,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_scheduled
  ON public.products (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;
