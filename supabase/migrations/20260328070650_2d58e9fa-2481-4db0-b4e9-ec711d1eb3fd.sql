
-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
  discount_value numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'product', 'category', 'user', 'bulk')),
  scope_target_id uuid,
  scope_target_user_id uuid,
  min_order_amount numeric DEFAULT 0,
  min_quantity integer DEFAULT 1,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  is_stackable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discount codes" ON public.discount_codes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes FOR SELECT TO public USING (is_active = true);

-- Promotion popup settings (stored in site_settings as key='promotion_popup')

-- Add shipping address to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT null;
