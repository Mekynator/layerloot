
-- Translation entries for static UI keys (database-backed locale management)
CREATE TABLE public.translation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL DEFAULT 'common',
  key text NOT NULL,
  locale text NOT NULL,
  value text NOT NULL DEFAULT '',
  draft_value text,
  has_draft boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  source_hash text,
  status text NOT NULL DEFAULT 'published',
  updated_by uuid,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, locale)
);

ALTER TABLE public.translation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage translation entries" ON public.translation_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Public read published translation entries" ON public.translation_entries
  FOR SELECT TO anon
  USING (is_published = true);

CREATE TRIGGER set_translation_entries_updated_at
  BEFORE UPDATE ON public.translation_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed translations.manage permission
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin', 'translations.manage'),
  ('admin', 'translations.manage'),
  ('editor', 'translations.manage')
ON CONFLICT DO NOTHING;
