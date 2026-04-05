-- Fix showcase_reviews SELECT policy: restrict to reviews on approved+shared showcases or own reviews
DROP POLICY IF EXISTS "Users view reviews on approved showcases" ON public.showcase_reviews;

CREATE POLICY "Users view reviews on visible showcases"
ON public.showcase_reviews
FOR SELECT
TO authenticated
USING (
  -- User can see their own reviews
  auth.uid() = user_id
  -- Or reviews on approved+shared showcases
  OR EXISTS (
    SELECT 1 FROM public.custom_order_showcases s
    WHERE s.id = showcase_reviews.showcase_id
      AND s.visibility_status = 'shared'
      AND s.approved_by_admin = true
  )
  -- Admins can see all
  OR has_role(auth.uid(), 'admin'::app_role)
);