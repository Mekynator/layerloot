-- Fix 1: Replace permissive chat_conversations UPDATE policies with scoped ones
DROP POLICY IF EXISTS "Anon update conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Auth update conversations" ON public.chat_conversations;

-- Anon users can only update conversations that have no user_id (their own anonymous sessions)
CREATE POLICY "Anon update own conversations"
ON public.chat_conversations FOR UPDATE
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);

-- Authenticated users can only update their own conversations
CREATE POLICY "Auth update own conversations"
ON public.chat_conversations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix 2: Restrict admin_permissions SELECT to admin roles only
DROP POLICY IF EXISTS "Anyone can read permissions" ON public.admin_permissions;

CREATE POLICY "Admin roles read permissions"
ON public.admin_permissions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

-- Fix 3: Update can_access_custom_order to check email_verified
CREATE OR REPLACE FUNCTION public.can_access_custom_order(_order_user_id uuid, _order_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT auth.uid() = _order_user_id
    OR (
      lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(_order_email, ''))
      AND (auth.jwt() ->> 'email_verified')::boolean = true
    );
$function$;