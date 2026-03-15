
-- Add missing columns to custom_orders
ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS quoted_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_offer_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_agreed_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_response_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS production_status text NOT NULL DEFAULT 'pending';

-- Add tool_type column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tool_type text DEFAULT NULL;

-- Create custom_order_messages table
CREATE TABLE IF NOT EXISTS public.custom_order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_order_id uuid NOT NULL REFERENCES public.custom_orders(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'user',
  sender_user_id uuid DEFAULT NULL,
  message text,
  message_type text NOT NULL DEFAULT 'note',
  proposed_price numeric DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on custom_order_messages
ALTER TABLE public.custom_order_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins manage custom order messages"
  ON public.custom_order_messages
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Users can view messages for their own custom orders
CREATE POLICY "Users view own custom order messages"
  ON public.custom_order_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_orders
    WHERE custom_orders.id = custom_order_messages.custom_order_id
      AND custom_orders.user_id = auth.uid()
  ));

-- RLS: Users can insert messages for their own custom orders
CREATE POLICY "Users insert own custom order messages"
  ON public.custom_order_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_orders
    WHERE custom_orders.id = custom_order_messages.custom_order_id
      AND custom_orders.user_id = auth.uid()
  ));
