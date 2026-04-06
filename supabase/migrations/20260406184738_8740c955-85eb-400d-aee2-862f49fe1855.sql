ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'orders_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'custom';