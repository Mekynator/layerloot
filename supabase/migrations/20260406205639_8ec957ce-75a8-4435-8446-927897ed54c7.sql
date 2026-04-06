
-- Fix: Users can self-approve showcases via unrestricted INSERT and UPDATE policies
-- Drop existing permissive user INSERT/UPDATE policies
DROP POLICY IF EXISTS "Users insert own showcases" ON public.custom_order_showcases;
DROP POLICY IF EXISTS "Users update own showcases" ON public.custom_order_showcases;

-- Recreate INSERT policy: users can only insert with admin flags forced to safe defaults
CREATE POLICY "Users insert own showcases"
ON public.custom_order_showcases
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_user_id
  AND approved_by_admin = false
  AND featured = false
  AND reorder_enabled = false
);

-- Recreate UPDATE policy: users can update own showcases but cannot modify admin-only flags
CREATE POLICY "Users update own showcases"
ON public.custom_order_showcases
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (
  auth.uid() = owner_user_id
  AND approved_by_admin = false
  AND featured = false
  AND reorder_enabled = false
);
