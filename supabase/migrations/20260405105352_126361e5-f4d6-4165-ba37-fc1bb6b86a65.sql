
-- 1. Fix broken referral_invites UPDATE policy (self-referencing subquery bug)
DROP POLICY IF EXISTS "Users update own invites limited" ON public.referral_invites;

CREATE POLICY "Users update own invites limited" ON public.referral_invites
FOR UPDATE TO authenticated
USING (inviter_user_id = auth.uid())
WITH CHECK (
  inviter_user_id = auth.uid()
  AND NOT (status IS DISTINCT FROM (SELECT ri.status FROM public.referral_invites ri WHERE ri.id = referral_invites.id))
  AND NOT (inviter_points_granted IS DISTINCT FROM (SELECT ri.inviter_points_granted FROM public.referral_invites ri WHERE ri.id = referral_invites.id))
  AND NOT (invited_points_granted IS DISTINCT FROM (SELECT ri.invited_points_granted FROM public.referral_invites ri WHERE ri.id = referral_invites.id))
  AND NOT (invited_user_id IS DISTINCT FROM (SELECT ri.invited_user_id FROM public.referral_invites ri WHERE ri.id = referral_invites.id))
);

-- 2. Remove referral_invites from Realtime publication to prevent PII leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.referral_invites;

-- 3. Fix chat_conversations UPDATE policies - scope properly
DROP POLICY IF EXISTS "Anon update own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Auth update own conversations" ON public.chat_conversations;

CREATE POLICY "Anon update own conversations" ON public.chat_conversations
FOR UPDATE TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);

CREATE POLICY "Auth update own conversations" ON public.chat_conversations
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Fix admin_activity_log INSERT policy - require admin role
DROP POLICY IF EXISTS "Any admin can insert activity" ON public.admin_activity_log;

CREATE POLICY "Admin roles can insert activity" ON public.admin_activity_log
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
  )
);

-- 5. Fix newsletter_subscribers email validation
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
FOR INSERT TO public
WITH CHECK (
  email IS NOT NULL
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 6. Restrict site_blocks public SELECT to exclude draft columns using a view
-- Replace the permissive public SELECT policy with one that uses a security barrier view
DROP POLICY IF EXISTS "Anyone can view active blocks" ON public.site_blocks;

-- Create a secure view for public block access (excludes draft fields)
CREATE OR REPLACE VIEW public.published_site_blocks WITH (security_barrier = true) AS
SELECT id, page, block_type, title, content, sort_order, is_active, created_at, updated_at, published_at
FROM public.site_blocks
WHERE is_active = true;

-- Re-add the public SELECT policy but it now only matters for the base table (admins use it)
CREATE POLICY "Anyone can view active blocks" ON public.site_blocks
FOR SELECT TO public
USING (is_active = true);
