
-- Fix custom-order-files INSERT policy
DROP POLICY IF EXISTS "Authenticated users upload custom order files" ON storage.objects;
CREATE POLICY "Authenticated users upload custom order files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'custom-order-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Fix gallery-images INSERT policy
DROP POLICY IF EXISTS "Authenticated users upload gallery images" ON storage.objects;
CREATE POLICY "Authenticated users upload gallery images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
