
-- Create policies table
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Public can read visible policies
CREATE POLICY "Anyone can view visible policies"
ON public.policies FOR SELECT TO public
USING (is_visible = true);

-- Admins can do everything
CREATE POLICY "Admins manage policies"
ON public.policies FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role) OR
  has_role(auth.uid(), 'content_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'owner'::app_role) OR
  has_role(auth.uid(), 'content_admin'::app_role)
);

-- Updated_at trigger
CREATE TRIGGER set_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed default policies from existing POLICY_KEYS
INSERT INTO public.policies (title, slug, sort_order) VALUES
  ('Returns Policy', 'returns-policy', 0),
  ('Cancellation Policy', 'cancellation-policy', 1),
  ('Refund Policy', 'refund-policy', 2),
  ('Privacy Policy', 'privacy-policy', 3),
  ('Terms of Service', 'terms-of-service', 4),
  ('Safety Regulations', 'safety-regulations', 5),
  ('Intellectual Property & Rights', 'intellectual-property', 6),
  ('Shipping Policy', 'shipping-policy', 7);
