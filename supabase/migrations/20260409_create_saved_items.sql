-- LayerLoot: Saved Items table for Save for Later feature
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Guests cannot insert, update, or delete
CREATE POLICY "Guests cannot modify saved items" ON public.saved_items
  FOR ALL TO public USING (false);

-- Anyone can read saved items for their own user
CREATE POLICY "Users can read their own saved items" ON public.saved_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
