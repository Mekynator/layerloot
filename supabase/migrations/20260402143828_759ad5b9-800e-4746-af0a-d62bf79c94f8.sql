
-- 1. Custom Order Automation Rules
CREATE TABLE public.custom_order_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_order_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation rules" ON public.custom_order_automation_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. SLA Tracking
CREATE TABLE public.custom_order_sla_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_order_id uuid NOT NULL REFERENCES public.custom_orders(id) ON DELETE CASCADE,
  stage text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz,
  resolved_at timestamptz,
  sla_status text NOT NULL DEFAULT 'on_track',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_order_sla_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage SLA tracking" ON public.custom_order_sla_tracking
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Message Templates
CREATE TABLE public.custom_order_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key text NOT NULL,
  title text NOT NULL,
  template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_order_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage message templates" ON public.custom_order_message_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read message templates" ON public.custom_order_message_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 4. Add unread columns to custom_orders
ALTER TABLE public.custom_orders
  ADD COLUMN IF NOT EXISTS unread_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unread_by_user boolean NOT NULL DEFAULT false;
