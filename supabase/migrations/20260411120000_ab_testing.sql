-- A/B Testing tables
-- experiments, variants, assignments (server-side), and metrics aggregation

-- 1. Experiments
CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  target_type text NOT NULL CHECK (target_type IN ('page', 'section', 'popup', 'component')),
  target_id text NOT NULL,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  winner_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage experiments"
  ON public.ab_experiments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'owner'))
    )
  );

CREATE POLICY "Public can read running experiments"
  ON public.ab_experiments FOR SELECT
  USING (status = 'running');

-- 2. Experiment Variants
CREATE TABLE IF NOT EXISTS public.ab_experiment_variants (
  id text PRIMARY KEY,
  experiment_id text NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  weight integer NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
  is_control boolean NOT NULL DEFAULT false,
  content_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_experiment_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage variants"
  ON public.ab_experiment_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'owner'))
    )
  );

CREATE POLICY "Public can read variants of running experiments"
  ON public.ab_experiment_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ab_experiments e
      WHERE e.id = experiment_id AND e.status = 'running'
    )
  );

-- 3. Server-side assignments (for logged-in users / cross-device consistency)
CREATE TABLE IF NOT EXISTS public.ab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id text NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  variant_id text NOT NULL REFERENCES public.ab_experiment_variants(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, user_id),
  UNIQUE (experiment_id, session_id)
);

ALTER TABLE public.ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own assignments"
  ON public.ab_assignments FOR SELECT
  USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "System can insert assignments"
  ON public.ab_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage assignments"
  ON public.ab_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'owner'))
    )
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON public.ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_target ON public.ab_experiments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON public.ab_experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON public.ab_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON public.ab_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_session ON public.ab_assignments(session_id);

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ab_experiment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ab_experiment_updated
  BEFORE UPDATE ON public.ab_experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ab_experiment_timestamp();
