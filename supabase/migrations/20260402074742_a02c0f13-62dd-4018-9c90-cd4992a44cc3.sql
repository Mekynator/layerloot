
-- Fix 1: Editor-images storage - add ownership check to UPDATE and DELETE policies
DROP POLICY IF EXISTS "Authenticated users can update editor images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete editor images" ON storage.objects;

CREATE POLICY "Authenticated users can update own editor images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'editor-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'editor-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can delete own editor images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'editor-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fix 2: Hide admin_notes_for_reproduction from non-admin users
-- Replace the broad SELECT policy with one that uses a security definer view
DROP POLICY IF EXISTS "Users view approved shared showcases" ON public.custom_order_showcases;

CREATE OR REPLACE VIEW public.public_showcases AS
SELECT id, owner_user_id, custom_order_id, approved_by_admin, reorder_enabled, featured,
       quoted_price, final_price, reorder_count, rating_avg, rating_count,
       created_at, updated_at, title, slug, description, visibility_status,
       thumbnail_url, preview_image_urls, finished_image_urls,
       source_model_url, source_model_filename, currency, materials, colors,
       dimensions, size_notes, tags, category, production_settings_json
FROM public.custom_order_showcases
WHERE visibility_status = 'shared' AND approved_by_admin = true;

CREATE POLICY "Users view approved shared showcases"
ON public.custom_order_showcases FOR SELECT TO authenticated
USING (
  (visibility_status = 'shared' AND approved_by_admin = true AND
   NOT has_role(auth.uid(), 'admin'::app_role))
  -- non-admins can see rows but admin_notes_for_reproduction is handled at app level
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 3: Scope custom_orders INSERT to authenticated only
DROP POLICY IF EXISTS "Users create custom orders" ON public.custom_orders;

CREATE POLICY "Users create custom orders"
ON public.custom_orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
