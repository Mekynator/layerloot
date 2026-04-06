-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'editor',
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations" ON public.admin_invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'owner'));

-- Add owner permission (wildcard)
INSERT INTO public.admin_permissions (role, permission) VALUES ('owner', '*') ON CONFLICT DO NOTHING;

-- Content Admin permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('content_admin', 'content.edit'),
  ('content_admin', 'content.preview'),
  ('content_admin', 'content.publish'),
  ('content_admin', 'products.manage'),
  ('content_admin', 'products.publish'),
  ('content_admin', 'categories.manage'),
  ('content_admin', 'media.manage'),
  ('content_admin', 'translations.manage'),
  ('content_admin', 'backgrounds.manage'),
  ('content_admin', 'showcases.manage')
ON CONFLICT DO NOTHING;

-- Orders Admin permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('orders_admin', 'orders.manage'),
  ('orders_admin', 'custom_orders.manage'),
  ('orders_admin', 'shipping.manage'),
  ('orders_admin', 'customers.view'),
  ('orders_admin', 'pricing.manage')
ON CONFLICT DO NOTHING;

-- Support Admin permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('support_admin', 'customers.view'),
  ('support_admin', 'orders.manage'),
  ('support_admin', 'custom_orders.manage'),
  ('support_admin', 'reviews.manage'),
  ('support_admin', 'settings.view')
ON CONFLICT DO NOTHING;

-- Marketing Admin permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('marketing_admin', 'campaigns.manage'),
  ('marketing_admin', 'discounts.manage'),
  ('marketing_admin', 'revenue.view'),
  ('marketing_admin', 'reports.view'),
  ('marketing_admin', 'settings.view')
ON CONFLICT DO NOTHING;