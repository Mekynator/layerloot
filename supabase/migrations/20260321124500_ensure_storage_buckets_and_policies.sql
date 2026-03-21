-- Ensure required storage buckets exist for admin product management and related flows.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('3d-models', '3d-models', true),
  ('custom-orders', 'custom-orders', true),
  ('site-assets', 'site-assets', true),
  ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

-- Product image policies
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3D model policies
DROP POLICY IF EXISTS "Anyone can view 3d models" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload 3d models" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete 3d models" ON storage.objects;
DROP POLICY IF EXISTS "Admins update 3d models" ON storage.objects;

CREATE POLICY "Anyone can view 3d models"
ON storage.objects FOR SELECT
USING (bucket_id = '3d-models');

CREATE POLICY "Admins upload 3d models"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = '3d-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update 3d models"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = '3d-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete 3d models"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = '3d-models' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Custom order uploads (used by create-your-own)
DROP POLICY IF EXISTS "Anyone can view custom order files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload custom order files" ON storage.objects;

CREATE POLICY "Anyone can view custom order files"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-orders');

CREATE POLICY "Authenticated users upload custom order files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'custom-orders');
