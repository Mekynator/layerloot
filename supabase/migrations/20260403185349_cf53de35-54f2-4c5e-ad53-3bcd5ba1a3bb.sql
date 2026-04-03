-- Fix 1: Remove unscoped editor-images storage policies that allow any authenticated user to delete/update any file
DROP POLICY IF EXISTS "Authenticated users delete editor images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update editor images" ON storage.objects;

-- Fix 2: Add explicit admin-only SELECT policy on discount_codes for clarity
CREATE POLICY "Admins can view discount codes"
  ON public.discount_codes
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));