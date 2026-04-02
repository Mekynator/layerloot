
ALTER TABLE public.content_revisions
  ADD COLUMN IF NOT EXISTS change_summary text,
  ADD COLUMN IF NOT EXISTS restored_from_revision_id uuid;

ALTER TABLE public.site_blocks
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_blocks_scheduled
  ON public.site_blocks (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;

CREATE INDEX IF NOT EXISTS idx_settings_scheduled
  ON public.site_settings (scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND has_draft = true;
