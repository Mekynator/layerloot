
-- Referral invites table
CREATE TABLE public.referral_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  invited_email text,
  invited_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  account_created_at timestamptz,
  first_order_id uuid,
  first_order_at timestamptz,
  inviter_points_granted boolean NOT NULL DEFAULT false,
  invited_points_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_referral_invites_inviter ON public.referral_invites(inviter_user_id);
CREATE INDEX idx_referral_invites_invited ON public.referral_invites(invited_user_id);
CREATE INDEX idx_referral_invites_code ON public.referral_invites(invite_code);

-- Enable RLS
ALTER TABLE public.referral_invites ENABLE ROW LEVEL SECURITY;

-- Users can view their own invites (as inviter)
CREATE POLICY "Users view own invites" ON public.referral_invites
  FOR SELECT TO authenticated
  USING (inviter_user_id = auth.uid());

-- Users can see invites where they are the invited user
CREATE POLICY "Invited users see own invite" ON public.referral_invites
  FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid());

-- Users can create invites
CREATE POLICY "Users create invites" ON public.referral_invites
  FOR INSERT TO authenticated
  WITH CHECK (inviter_user_id = auth.uid());

-- Users can update their own invites (e.g. set invited_email)
CREATE POLICY "Users update own invites" ON public.referral_invites
  FOR UPDATE TO authenticated
  USING (inviter_user_id = auth.uid());

-- Admins manage all
CREATE POLICY "Admins manage referral invites" ON public.referral_invites
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can update (for triggers/functions)
CREATE POLICY "Service role manages referrals" ON public.referral_invites
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER set_referral_invites_updated_at
  BEFORE UPDATE ON public.referral_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime for referral status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_invites;
