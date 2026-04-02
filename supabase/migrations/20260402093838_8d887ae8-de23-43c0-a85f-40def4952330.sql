
-- media_assets: central registry for all uploaded media
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  original_name text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'editor-images',
  storage_path text NOT NULL,
  public_url text NOT NULL,
  alt_text text DEFAULT '',
  title text DEFAULT '',
  description text DEFAULT '',
  tags text[] DEFAULT '{}',
  media_type text NOT NULL DEFAULT 'image',
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  width integer,
  height integer,
  file_size_bytes bigint DEFAULT 0,
  folder text NOT NULL DEFAULT '/',
  uploaded_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage media assets"
  ON public.media_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Public can view media assets"
  ON public.media_assets FOR SELECT TO public
  USING (is_archived = false);

-- media_asset_versions: version history when asset is replaced
CREATE TABLE public.media_asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_size_bytes bigint DEFAULT 0,
  replaced_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_asset_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage asset versions"
  ON public.media_asset_versions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- reusable_blocks: saved reusable content sections
CREATE TABLE public.reusable_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  block_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  created_by uuid,
  updated_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reusable_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reusable blocks"
  ON public.reusable_blocks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- auto-update updated_at
CREATE TRIGGER set_media_assets_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_reusable_blocks_updated_at BEFORE UPDATE ON public.reusable_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed media.manage permission for admin roles
INSERT INTO public.admin_permissions (role, permission)
VALUES
  ('super_admin', 'media.manage'),
  ('admin', 'media.manage'),
  ('editor', 'media.manage')
ON CONFLICT DO NOTHING;
