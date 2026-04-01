
-- 1. Enable RLS on site_pages and add policies
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published pages"
  ON public.site_pages FOR SELECT
  TO public USING (is_published = true);

CREATE POLICY "Admins manage pages"
  ON public.site_pages FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 2. Fix profiles: drop overly permissive public SELECT, add owner + admin policies
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. Drop permissive site-assets storage policies (admin-scoped ones remain)
DROP POLICY IF EXISTS "Authenticated users can upload site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete site-assets" ON storage.objects;
