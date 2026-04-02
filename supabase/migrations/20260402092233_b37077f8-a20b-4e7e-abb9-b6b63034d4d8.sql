
-- Permission definitions per role
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read permissions" ON public.admin_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage permissions" ON public.admin_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Activity log
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_role text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  summary text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin roles can view activity" ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR public.has_role(auth.uid(), 'support')
  );
CREATE POLICY "Any admin can insert activity" ON public.admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activity_created ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_activity_user ON public.admin_activity_log (user_id);
CREATE INDEX idx_activity_action ON public.admin_activity_log (action);

-- has_permission security definer function
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_permissions ap
    JOIN public.user_roles ur ON ur.role = ap.role
    WHERE ur.user_id = _user_id
      AND (ap.permission = _permission OR ap.permission = '*')
  )
$$;

-- Seed default permissions
INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin','*'),
  ('admin','products.manage'),
  ('admin','orders.manage'),
  ('admin','customers.view'),
  ('admin','reviews.manage'),
  ('admin','showcases.manage'),
  ('admin','discounts.manage'),
  ('admin','shipping.manage'),
  ('admin','content.edit'),
  ('admin','content.publish'),
  ('admin','content.preview'),
  ('admin','categories.manage'),
  ('admin','pricing.manage'),
  ('admin','campaigns.manage'),
  ('admin','reports.view'),
  ('admin','revenue.view'),
  ('admin','backgrounds.manage'),
  ('admin','settings.view'),
  ('admin','custom_orders.manage'),
  ('editor','content.edit'),
  ('editor','content.preview'),
  ('editor','backgrounds.manage'),
  ('editor','categories.manage'),
  ('support','orders.manage'),
  ('support','customers.view'),
  ('support','reviews.manage'),
  ('support','custom_orders.manage');
