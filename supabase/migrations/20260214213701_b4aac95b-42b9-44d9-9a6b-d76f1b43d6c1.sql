
-- ============================================
-- 1. Product Variants
-- ============================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- e.g. "Red / Large"
  sku TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',  -- {"color": "Red", "size": "Large", "material": "PLA"}
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variants" ON public.product_variants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins view all variants" ON public.product_variants
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage variants" ON public.product_variants
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. Product Reviews
-- ============================================
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own reviews" ON public.product_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage reviews" ON public.product_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. Order Status History
-- ============================================
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own order history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Admins manage order history" ON public.order_status_history
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. Site Content Blocks (CMS)
-- ============================================
CREATE TABLE public.site_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL DEFAULT 'home',          -- 'home', 'contact', etc.
  block_type TEXT NOT NULL,                    -- 'hero', 'carousel', 'video', 'text', 'image', 'banner', 'cta'
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',         -- flexible content per block type
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active blocks" ON public.site_blocks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage blocks" ON public.site_blocks
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_blocks_updated_at
  BEFORE UPDATE ON public.site_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 5. Site Settings (contact info, etc.)
-- ============================================
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins manage settings" ON public.site_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
  ('contact', '{"email": "info@layerloot.com", "phone": "+45 00 00 00 00", "address": "Copenhagen, Denmark", "social": {"instagram": "", "facebook": "", "youtube": ""}}'),
  ('store', '{"name": "LayerLoot", "currency": "DKK", "currency_symbol": "kr"}');

-- ============================================
-- 6. Update user_vouchers for gift card balance
-- ============================================
ALTER TABLE public.user_vouchers
  ADD COLUMN balance NUMERIC DEFAULT NULL,
  ADD COLUMN recipient_email TEXT DEFAULT NULL,
  ADD COLUMN recipient_name TEXT DEFAULT NULL;

-- Allow users to update their own vouchers (for using balance)
CREATE POLICY "Users update own vouchers" ON public.user_vouchers
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin manage vouchers
CREATE POLICY "Admins manage user vouchers" ON public.user_vouchers
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 7. Storage bucket for site assets (videos, images)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "Admins upload site assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'));

-- ============================================
-- 8. Add tracking_number to orders
-- ============================================
ALTER TABLE public.orders
  ADD COLUMN tracking_number TEXT DEFAULT NULL,
  ADD COLUMN tracking_url TEXT DEFAULT NULL,
  ADD COLUMN notes TEXT DEFAULT NULL;
