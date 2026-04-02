
-- Instagram media cache table
CREATE TABLE public.instagram_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_media_id text NOT NULL UNIQUE,
  media_type text NOT NULL DEFAULT 'IMAGE',
  caption text,
  permalink text,
  media_url text,
  thumbnail_url text,
  timestamp timestamptz,
  username text,
  is_story boolean NOT NULL DEFAULT false,
  is_reel boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  sync_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Instagram connection settings (singleton)
CREATE TABLE public.instagram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_connected boolean NOT NULL DEFAULT false,
  username text,
  account_id text,
  last_sync_at timestamptz,
  sync_status text NOT NULL DEFAULT 'disconnected',
  sync_error text,
  display_config jsonb NOT NULL DEFAULT '{
    "content_types": ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"],
    "items_to_show": 12,
    "layout": "grid",
    "show_captions": false,
    "show_dates": false,
    "show_profile_header": true,
    "show_cta": true,
    "show_reel_badge": true,
    "click_action": "instagram",
    "autoplay_reels": false,
    "aspect_ratio": "square"
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for instagram_media
ALTER TABLE public.instagram_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active instagram media"
  ON public.instagram_media FOR SELECT TO public
  USING (sync_status = 'active');

CREATE POLICY "Admins manage instagram media"
  ON public.instagram_media FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for instagram_settings
ALTER TABLE public.instagram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view instagram settings"
  ON public.instagram_settings FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage instagram settings"
  ON public.instagram_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row
INSERT INTO public.instagram_settings (is_connected) VALUES (false);
