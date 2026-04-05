
-- Add new discount engine columns
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS target_mode text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS discount_rules jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS per_user_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- Migrate existing data: rows with scope_target_user_id set become specific_user
UPDATE public.discount_codes
SET target_mode = 'specific_user'
WHERE scope_target_user_id IS NOT NULL;

-- Rows with scope = 'user' but no scope_target_user_id stay as 'all' (will be rules_based if discount_rules gets set later)
