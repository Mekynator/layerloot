
-- Update admin_activity_log policies to recognize all admin roles
DROP POLICY IF EXISTS "Admin roles can insert activity" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admin roles can view activity" ON public.admin_activity_log;

CREATE POLICY "Admin roles can insert activity" ON public.admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
      OR has_role(auth.uid(), 'editor'::app_role)
      OR has_role(auth.uid(), 'support'::app_role)
      OR has_role(auth.uid(), 'content_admin'::app_role)
      OR has_role(auth.uid(), 'orders_admin'::app_role)
      OR has_role(auth.uid(), 'support_admin'::app_role)
      OR has_role(auth.uid(), 'marketing_admin'::app_role)
      OR has_role(auth.uid(), 'custom'::app_role)
    )
  );

CREATE POLICY "Admin roles can view activity" ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
    OR has_role(auth.uid(), 'content_admin'::app_role)
    OR has_role(auth.uid(), 'orders_admin'::app_role)
    OR has_role(auth.uid(), 'support_admin'::app_role)
    OR has_role(auth.uid(), 'marketing_admin'::app_role)
    OR has_role(auth.uid(), 'custom'::app_role)
  );

-- Update admin_permissions read policy to include all admin roles
DROP POLICY IF EXISTS "Admin roles read permissions" ON public.admin_permissions;

CREATE POLICY "Admin roles read permissions" ON public.admin_permissions
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
    OR has_role(auth.uid(), 'content_admin'::app_role)
    OR has_role(auth.uid(), 'orders_admin'::app_role)
    OR has_role(auth.uid(), 'support_admin'::app_role)
    OR has_role(auth.uid(), 'marketing_admin'::app_role)
    OR has_role(auth.uid(), 'custom'::app_role)
  );

-- Update super_admin manage permissions to include owner
DROP POLICY IF EXISTS "Super admins manage permissions" ON public.admin_permissions;

CREATE POLICY "Owner and super admins manage permissions" ON public.admin_permissions
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- Update admin_internal_notes to include all admin roles
DROP POLICY IF EXISTS "Admins manage internal notes" ON public.admin_internal_notes;

CREATE POLICY "Admins manage internal notes" ON public.admin_internal_notes
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
    OR has_role(auth.uid(), 'content_admin'::app_role)
    OR has_role(auth.uid(), 'orders_admin'::app_role)
    OR has_role(auth.uid(), 'support_admin'::app_role)
    OR has_role(auth.uid(), 'marketing_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'support'::app_role)
    OR has_role(auth.uid(), 'content_admin'::app_role)
    OR has_role(auth.uid(), 'orders_admin'::app_role)
    OR has_role(auth.uid(), 'support_admin'::app_role)
    OR has_role(auth.uid(), 'marketing_admin'::app_role)
  );
