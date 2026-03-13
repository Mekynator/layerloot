
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS print_time_hours numeric NULL,
  ADD COLUMN IF NOT EXISTS dimensions_cm jsonb NULL,
  ADD COLUMN IF NOT EXISTS weight_grams numeric NULL,
  ADD COLUMN IF NOT EXISTS finish_type text NULL,
  ADD COLUMN IF NOT EXISTS material_type text NULL;
