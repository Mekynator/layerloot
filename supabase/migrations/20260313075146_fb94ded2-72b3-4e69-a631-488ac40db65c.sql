
-- Gallery posts table for customer gallery
CREATE TABLE public.gallery_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  product_name TEXT NOT NULL,
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved gallery posts" ON public.gallery_posts
  FOR SELECT TO public USING (is_approved = true);

CREATE POLICY "Users view own gallery posts" ON public.gallery_posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create gallery posts" ON public.gallery_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage gallery posts" ON public.gallery_posts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Creator submissions table
CREATE TABLE public.creator_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_name TEXT NOT NULL,
  email TEXT NOT NULL,
  portfolio_url TEXT,
  model_url TEXT NOT NULL,
  model_filename TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create submissions" ON public.creator_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own submissions" ON public.creator_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage submissions" ON public.creator_submissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Gallery images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true);

-- Storage policies for gallery-images
CREATE POLICY "Anyone can view gallery images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users upload gallery images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Admins manage gallery images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery-images' AND public.has_role(auth.uid(), 'admin'));
