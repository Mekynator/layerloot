-- 1) Remove the old table completely
DROP TABLE IF EXISTS public.user_points CASCADE;

-- 2) Make sure the rewards in vouchers match the rewards store UI
INSERT INTO public.vouchers (name, description, points_cost, discount_type, discount_value, is_active)
VALUES
  ('25 KR DISCOUNT', 'Get 25 kr off your next order', 200, 'fixed_discount', 25, true),
  ('50 KR DISCOUNT', 'Get 50 kr off your next order', 400, 'fixed_discount', 50, true),
  ('100 KR DISCOUNT', 'Get 100 kr off your next order', 800, 'fixed_discount', 100, true),
  ('150 KR DISCOUNT', 'Get 150 kr off your next order', 1200, 'fixed_discount', 150, true),
  ('250 KR DISCOUNT', 'Get 250 kr off your next order', 2000, 'fixed_discount', 250, true),
  ('500 KR GIFT CARD', 'A 500 kr gift card - use it yourself or send it to someone!', 5000, 'gift_card', 500, true),
  ('FREE DELIVERY DISCOUNT', 'Get free delivery on one order', 800, 'free_shipping', 0, true)
ON CONFLICT DO NOTHING;

-- 3) Useful index for loyalty balance lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id
ON public.loyalty_points(user_id);

-- 4) Optional check
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%points%';
