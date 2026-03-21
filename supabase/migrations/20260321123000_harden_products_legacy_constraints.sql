-- Harden products compatibility across legacy/new schemas.
-- Prevent legacy NOT NULL columns from blocking inserts from the current app payload.

alter table public.products
  add column if not exists title text,
  add column if not exists subtitle text,
  add column if not exists price_from_dkk numeric(10,2),
  add column if not exists image_url text,
  add column if not exists category text,
  add column if not exists active boolean;

update public.products
set
  title = coalesce(title, name, slug, id::text),
  subtitle = coalesce(subtitle, description, ''),
  price_from_dkk = coalesce(price_from_dkk, price, 0),
  image_url = coalesce(image_url, case when array_length(images, 1) is null then null else images[1] end),
  category = coalesce(category, ''),
  active = coalesce(active, is_active, true)
where
  title is null
  or subtitle is null
  or price_from_dkk is null
  or category is null
  or active is null;

alter table public.products alter column title drop not null;
alter table public.products alter column title set default '';

alter table public.products alter column subtitle drop not null;
alter table public.products alter column subtitle set default '';

alter table public.products alter column price_from_dkk drop not null;
alter table public.products alter column price_from_dkk set default 0;

alter table public.products alter column category drop not null;
alter table public.products alter column category set default '';

alter table public.products alter column active drop not null;
alter table public.products alter column active set default true;
