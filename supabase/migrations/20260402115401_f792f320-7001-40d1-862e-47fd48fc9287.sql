
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL DEFAULT 'seasonal',
  status text NOT NULL DEFAULT 'draft',
  priority integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_recurring boolean NOT NULL DEFAULT false,
  theme_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  effects jsonb NOT NULL DEFAULT '{}'::jsonb,
  chat_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  banner_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
  ON public.campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active campaigns"
  ON public.campaigns FOR SELECT
  TO public
  USING (status = 'active');
