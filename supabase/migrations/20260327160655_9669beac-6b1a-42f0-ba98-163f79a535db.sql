
ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS request_fee_amount numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS request_fee_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
