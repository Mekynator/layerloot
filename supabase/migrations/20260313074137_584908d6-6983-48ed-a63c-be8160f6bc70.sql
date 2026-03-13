
CREATE TABLE public.price_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  custom_order_id uuid REFERENCES public.custom_orders(id) ON DELETE SET NULL,
  admin_user_id uuid NOT NULL,
  material_cost_per_kg numeric NOT NULL DEFAULT 0,
  object_weight_grams numeric NOT NULL DEFAULT 0,
  print_time_hours numeric NOT NULL DEFAULT 0,
  electricity_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  machine_wear_factor numeric NOT NULL DEFAULT 0.05,
  failure_buffer numeric NOT NULL DEFAULT 0.1,
  finishing_difficulty text NOT NULL DEFAULT 'none',
  margin_percentage numeric NOT NULL DEFAULT 50,
  production_cost numeric NOT NULL DEFAULT 0,
  suggested_price numeric NOT NULL DEFAULT 0,
  final_price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage price calculations"
  ON public.price_calculations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
