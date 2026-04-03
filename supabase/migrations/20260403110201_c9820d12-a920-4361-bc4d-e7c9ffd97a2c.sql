
DROP VIEW IF EXISTS public.customer_custom_orders;
CREATE VIEW public.customer_custom_orders
WITH (security_invoker = true) AS
  SELECT id, user_id, name, email, description, model_url, model_filename,
         status, quoted_price, customer_offer_price, final_agreed_price,
         payment_status, production_status, request_fee_status,
         request_fee_amount, customer_response_status,
         stripe_checkout_session_id, metadata,
         unread_by_admin, unread_by_user,
         created_at, updated_at
  FROM public.custom_orders;
