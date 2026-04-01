-- Fix 1: Prevent non-admin users from inserting into user_roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Change user_vouchers update policy from public to authenticated
DROP POLICY IF EXISTS "Users update own vouchers" ON public.user_vouchers;
CREATE POLICY "Users update own vouchers"
ON public.user_vouchers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);