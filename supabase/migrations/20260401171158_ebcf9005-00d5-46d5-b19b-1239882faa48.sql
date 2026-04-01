
-- 1. Fix function search paths
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2. Fix permissive newsletter INSERT policy
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  TO public
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 5
  );

-- 3. Make custom-order-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'custom-order-files';

-- Remove public read policy
DROP POLICY IF EXISTS "Anyone can view custom order files" ON storage.objects;

-- Add owner + admin read policy
CREATE POLICY "Owners and admins view custom order files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'custom-order-files'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
