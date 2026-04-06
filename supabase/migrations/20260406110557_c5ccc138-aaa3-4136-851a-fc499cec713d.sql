-- Allow public (including guests) to read non-archived reusable blocks
CREATE POLICY "Public can view non-archived reusable blocks"
ON public.reusable_blocks
FOR SELECT
TO public
USING (is_archived = false);