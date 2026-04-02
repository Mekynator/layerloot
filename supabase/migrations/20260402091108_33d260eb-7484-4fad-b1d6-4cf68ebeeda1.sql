-- Migration 1: Extend site_blocks with draft columns
ALTER TABLE public.site_blocks
  ADD COLUMN IF NOT EXISTS draft_content jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Migration 2: Extend site_settings with draft columns
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS draft_value jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Migration 3: Create content_revisions table
CREATE TABLE public.content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id text NOT NULL,
  page text,
  revision_data jsonb NOT NULL,
  revision_number integer NOT NULL DEFAULT 1,
  action text NOT NULL DEFAULT 'publish',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_revision UNIQUE (content_type, content_id, revision_number)
);

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage revisions"
  ON public.content_revisions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_revisions_lookup
  ON public.content_revisions (content_type, content_id, revision_number DESC);

-- Migration 4: Clean up legacy draft keys
DELETE FROM public.site_settings WHERE key LIKE 'draft_blocks_%' OR key LIKE 'draft_setting_%';