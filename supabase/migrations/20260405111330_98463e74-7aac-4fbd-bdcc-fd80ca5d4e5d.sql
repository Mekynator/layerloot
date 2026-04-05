-- Fix newsletter_subscribers admin policy: scope to authenticated only
DROP POLICY IF EXISTS "Admins manage subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Admins manage subscribers" ON public.newsletter_subscribers
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));