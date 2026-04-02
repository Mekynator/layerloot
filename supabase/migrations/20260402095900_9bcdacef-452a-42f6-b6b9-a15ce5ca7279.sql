
CREATE TABLE public.admin_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  user_id uuid NOT NULL,
  note text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_internal_notes_entity ON public.admin_internal_notes (entity_type, entity_id);

ALTER TABLE public.admin_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage internal notes"
  ON public.admin_internal_notes
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  );

INSERT INTO public.admin_permissions (role, permission) VALUES
  ('super_admin', 'orders.manage'),
  ('admin', 'orders.manage'),
  ('support', 'orders.manage'),
  ('super_admin', 'custom_orders.manage'),
  ('admin', 'custom_orders.manage'),
  ('support', 'custom_orders.manage')
ON CONFLICT DO NOTHING;
