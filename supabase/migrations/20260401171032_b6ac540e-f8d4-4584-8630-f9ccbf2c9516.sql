
-- Remove overly permissive public SELECT on discount_codes
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
