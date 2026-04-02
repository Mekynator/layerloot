CREATE POLICY "Anon update conversations" ON public.chat_conversations
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Auth update conversations" ON public.chat_conversations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);