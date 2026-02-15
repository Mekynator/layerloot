
-- Add model_url column to products for 3D models
ALTER TABLE public.products ADD COLUMN model_url text NULL;

-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public) VALUES ('3d-models', '3d-models', true);

-- Storage policies for 3d-models bucket
CREATE POLICY "Anyone can view 3d models"
ON storage.objects FOR SELECT
USING (bucket_id = '3d-models');

CREATE POLICY "Admins upload 3d models"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = '3d-models' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete 3d models"
ON storage.objects FOR DELETE
USING (bucket_id = '3d-models' AND public.has_role(auth.uid(), 'admin'));

-- Create bucket for customer uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-order-files', 'custom-order-files', true);

CREATE POLICY "Anyone can view custom order files"
ON storage.objects FOR SELECT
USING (bucket_id = 'custom-order-files');

CREATE POLICY "Authenticated users upload custom order files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'custom-order-files' AND auth.uid() IS NOT NULL);

-- Custom orders table
CREATE TABLE public.custom_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  description text NOT NULL,
  model_url text NOT NULL,
  model_filename text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own custom orders"
ON public.custom_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users create custom orders"
ON public.custom_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage custom orders"
ON public.custom_orders FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_orders_updated_at
BEFORE UPDATE ON public.custom_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
