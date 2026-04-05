
-- 1. Add missing columns to referral_invites
ALTER TABLE public.referral_invites
  ADD COLUMN IF NOT EXISTS inviter_points_amount integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS invited_points_amount integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS reward_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_referral_invites_status ON public.referral_invites (status);
CREATE INDEX IF NOT EXISTS idx_referral_invites_invited_email ON public.referral_invites (invited_email);

-- 3. Add referred_by_invite_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_invite_id uuid REFERENCES public.referral_invites(id) ON DELETE SET NULL;

-- 4. Trigger to auto-set updated_at on referral_invites
CREATE OR REPLACE FUNCTION public.set_referral_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_invites_updated_at ON public.referral_invites;
CREATE TRIGGER trg_referral_invites_updated_at
  BEFORE UPDATE ON public.referral_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_updated_at();

-- 5. Harden RLS — drop permissive UPDATE policy for users, create restricted one
DROP POLICY IF EXISTS "Users update own invites" ON public.referral_invites;

CREATE POLICY "Users update own invites limited"
  ON public.referral_invites
  FOR UPDATE
  TO authenticated
  USING (inviter_user_id = auth.uid())
  WITH CHECK (
    inviter_user_id = auth.uid()
    AND status IS NOT DISTINCT FROM (SELECT status FROM public.referral_invites WHERE id = referral_invites.id)
    AND inviter_points_granted IS NOT DISTINCT FROM (SELECT inviter_points_granted FROM public.referral_invites WHERE id = referral_invites.id)
    AND invited_points_granted IS NOT DISTINCT FROM (SELECT invited_points_granted FROM public.referral_invites WHERE id = referral_invites.id)
    AND invited_user_id IS NOT DISTINCT FROM (SELECT invited_user_id FROM public.referral_invites WHERE id = referral_invites.id)
  );

-- 6. Create referral_user_stats view
CREATE OR REPLACE VIEW public.referral_user_stats AS
SELECT
  inviter_user_id,
  COUNT(*) FILTER (WHERE invited_email IS NOT NULL OR invited_user_id IS NOT NULL) AS total_invited,
  COUNT(*) FILTER (WHERE status IN ('registered','ordered')) AS accounts_created,
  COUNT(*) FILTER (WHERE status = 'ordered') AS first_orders,
  COALESCE(SUM(inviter_points_amount) FILTER (WHERE inviter_points_granted), 0) AS points_earned
FROM public.referral_invites
GROUP BY inviter_user_id;

-- 7. Create referral_admin_summary view
CREATE OR REPLACE VIEW public.referral_admin_summary AS
SELECT
  COUNT(*) AS total_invites,
  COUNT(*) FILTER (WHERE status != 'pending') AS accepted,
  COUNT(*) FILTER (WHERE status = 'ordered') AS first_orders,
  COALESCE(SUM(CASE WHEN inviter_points_granted THEN inviter_points_amount ELSE 0 END), 0) AS total_inviter_points,
  COALESCE(SUM(CASE WHEN invited_points_granted THEN invited_points_amount ELSE 0 END), 0) AS total_invited_points
FROM public.referral_invites;

-- 8. Grant access to views
GRANT SELECT ON public.referral_user_stats TO authenticated;
GRANT SELECT ON public.referral_admin_summary TO authenticated;
