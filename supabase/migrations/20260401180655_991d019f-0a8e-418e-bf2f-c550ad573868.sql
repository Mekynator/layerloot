INSERT INTO storage.buckets (id, name, public) VALUES ('editor-images', 'editor-images', true);

CREATE POLICY "Public read editor images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'editor-images');

CREATE POLICY "Authenticated users upload editor images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'editor-images');

CREATE POLICY "Authenticated users update editor images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'editor-images');

CREATE POLICY "Authenticated users delete editor images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'editor-images');