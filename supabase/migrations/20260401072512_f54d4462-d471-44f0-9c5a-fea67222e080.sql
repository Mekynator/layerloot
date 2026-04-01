
CREATE TABLE IF NOT EXISTS public.product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  answered_by UUID
);

CREATE INDEX idx_product_questions_product_id ON public.product_questions(product_id);
CREATE INDEX idx_product_questions_status ON public.product_questions(status);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can view public/approved questions
CREATE POLICY "Anyone can view public questions"
  ON public.product_questions FOR SELECT
  TO public
  USING (is_public = true);

-- Users can view their own questions
CREATE POLICY "Users view own questions"
  ON public.product_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can submit questions
CREATE POLICY "Users submit questions"
  ON public.product_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all questions
CREATE POLICY "Admins manage questions"
  ON public.product_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
