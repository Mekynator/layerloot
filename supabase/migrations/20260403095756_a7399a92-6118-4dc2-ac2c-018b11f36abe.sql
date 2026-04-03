
-- 1. User Events table for behavior tracking
CREATE TABLE public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  event_type text NOT NULL,
  product_id uuid,
  category_id uuid,
  custom_order_id uuid,
  page_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX idx_user_events_created_at ON public.user_events(created_at DESC);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert events"
  ON public.user_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Admins can view all events"
  ON public.user_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access"
  ON public.user_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. User Personalization Profiles
CREATE TABLE public.user_personalization_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_categories jsonb DEFAULT '[]'::jsonb,
  preferred_tags jsonb DEFAULT '[]'::jsonb,
  preferred_materials jsonb DEFAULT '[]'::jsonb,
  preferred_colors jsonb DEFAULT '[]'::jsonb,
  preferred_price_min numeric DEFAULT 0,
  preferred_price_max numeric DEFAULT 100000,
  custom_interest_score numeric DEFAULT 0,
  reorder_score numeric DEFAULT 0,
  rewards_interest_score numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  personalization_summary jsonb DEFAULT '{}'::jsonb,
  last_active_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_personalization_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_personalization_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.user_personalization_profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access on profiles"
  ON public.user_personalization_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Personalization Settings (admin-configurable)
CREATE TABLE public.personalization_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.personalization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read personalization settings"
  ON public.personalization_settings FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage personalization settings"
  ON public.personalization_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.personalization_settings (key, value) VALUES
  ('engine_enabled', 'true'::jsonb),
  ('weights', '{"behavior": 1, "preference": 1, "popularity": 1, "recency": 1}'::jsonb),
  ('dashboard_modules', '{"recommended": true, "buy_again": true, "recently_viewed": true, "custom_interest": true, "rewards_progress": true}'::jsonb),
  ('storefront_modules', '{"homepage_recommendations": true, "cart_upsells": true, "product_similar": true}'::jsonb);
