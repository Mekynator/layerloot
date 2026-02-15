
-- Newsletter subscribers
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage subscribers" ON public.newsletter_subscribers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- Shipping providers
CREATE TABLE public.shipping_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_kg NUMERIC NOT NULL DEFAULT 0,
  free_threshold NUMERIC,
  estimated_days TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage providers" ON public.shipping_providers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active providers" ON public.shipping_providers FOR SELECT USING (is_active = true);

-- Insert default providers
INSERT INTO public.shipping_providers (name, description, base_cost, cost_per_kg, free_threshold, estimated_days, sort_order) VALUES
('Standard Shipping', 'Regular delivery', 5.99, 0, 75, '5-7 business days', 0),
('Express Shipping', 'Fast delivery', 12.99, 0, NULL, '2-3 business days', 1),
('Overnight Shipping', 'Next day delivery', 24.99, 0, NULL, '1 business day', 2);
