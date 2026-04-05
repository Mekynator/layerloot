-- Fix 4: Add folder ownership check to editor-images INSERT policy
DROP POLICY IF EXISTS "Authenticated users upload editor images" ON storage.objects;

CREATE POLICY "Authenticated users upload editor images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'editor-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);