
ALTER TABLE public.ai_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view translations"
  ON public.ai_translations FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage translations"
  ON public.ai_translations FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'));
