
-- Product detail sections (video, image_carousel per product)
CREATE TABLE public.product_detail_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL DEFAULT 'video',
  title TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_detail_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active product sections"
  ON public.product_detail_sections FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins manage product sections"
  ON public.product_detail_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Product color options table
CREATE TABLE public.product_color_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_label TEXT,
  color_name TEXT NOT NULL,
  hex_value TEXT NOT NULL DEFAULT '#000000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_color_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active color options"
  ON public.product_color_options FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins manage color options"
  ON public.product_color_options FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add color picker config columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS enable_color_picker BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_selection_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS color_required BOOLEAN NOT NULL DEFAULT false;
