
-- 1. custom_order_showcases
CREATE TABLE public.custom_order_showcases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  custom_order_id uuid REFERENCES public.custom_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  visibility_status text NOT NULL DEFAULT 'private' CHECK (visibility_status IN ('private','shared')),
  approved_by_admin boolean NOT NULL DEFAULT false,
  reorder_enabled boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  preview_image_urls text[] DEFAULT '{}',
  finished_image_urls text[] DEFAULT '{}',
  source_model_url text,
  source_model_filename text,
  quoted_price numeric,
  final_price numeric,
  currency text NOT NULL DEFAULT 'DKK',
  materials text,
  colors text,
  dimensions text,
  size_notes text,
  production_settings_json jsonb DEFAULT '{}',
  admin_notes_for_reproduction text,
  tags text[] DEFAULT '{}',
  category text,
  reorder_count integer NOT NULL DEFAULT 0,
  rating_avg numeric DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

ALTER TABLE public.custom_order_showcases ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own
CREATE POLICY "Users view own showcases" ON public.custom_order_showcases
  FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);

CREATE POLICY "Users view approved shared showcases" ON public.custom_order_showcases
  FOR SELECT TO authenticated USING (visibility_status = 'shared' AND approved_by_admin = true);

CREATE POLICY "Users insert own showcases" ON public.custom_order_showcases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users update own showcases" ON public.custom_order_showcases
  FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);

CREATE POLICY "Users delete own showcases" ON public.custom_order_showcases
  FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage showcases" ON public.custom_order_showcases
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 2. showcase_reviews
CREATE TABLE public.showcase_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id uuid NOT NULL REFERENCES public.custom_order_showcases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(showcase_id, user_id)
);

ALTER TABLE public.showcase_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view reviews on approved showcases" ON public.showcase_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create reviews" ON public.showcase_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews" ON public.showcase_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews" ON public.showcase_reviews
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. showcase_favorites
CREATE TABLE public.showcase_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  showcase_id uuid NOT NULL REFERENCES public.custom_order_showcases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, showcase_id)
);

ALTER TABLE public.showcase_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON public.showcase_favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_showcases
  BEFORE UPDATE ON public.custom_order_showcases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
