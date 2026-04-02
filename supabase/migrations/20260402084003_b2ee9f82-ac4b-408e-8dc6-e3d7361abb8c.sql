ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS badge_text text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'fixed_discount',
  ADD COLUMN IF NOT EXISTS usage_limit_per_user integer,
  ADD COLUMN IF NOT EXISTS global_usage_limit integer,
  ADD COLUMN IF NOT EXISTS expiry_days integer;