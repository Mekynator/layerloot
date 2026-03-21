-- Align legacy products schema with the app's expected columns.

alter table public.products
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists price numeric(10,2),
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists images text[] default '{}'::text[],
  add column if not exists stock integer default 0,
  add column if not exists is_featured boolean default false,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists model_url text,
  add column if not exists print_time_hours numeric(10,2),
  add column if not exists dimensions_cm jsonb,
  add column if not exists weight_grams numeric(10,2),
  add column if not exists finish_type text,
  add column if not exists material_type text;

update public.products
set
  name = coalesce(name, title),
  description = coalesce(description, subtitle),
  price = coalesce(price, price_from_dkk, 0),
  is_active = coalesce(is_active, active, true),
  images = case
    when (images is null or array_length(images, 1) is null)
      then case when coalesce(image_url, '') <> '' then array[image_url] else '{}'::text[] end
    else images
  end,
  updated_at = coalesce(updated_at, created_at, now())
where
  name is null
  or description is null
  or price is null
  or is_active is null
  or images is null
  or updated_at is null;

update public.products
set slug = lower(trim(both '-' from regexp_replace(coalesce(name, 'product') || '-' || left(id::text, 8), '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null or slug = '';

-- Create categories from legacy text category values if needed.
insert into public.categories (name, slug, description)
select distinct
  p.category,
  lower(trim(both '-' from regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g'))),
  null
from public.products p
where coalesce(p.category, '') <> ''
on conflict (slug) do nothing;

-- Map legacy text category to category_id when empty.
update public.products p
set category_id = c.id
from public.categories c
where p.category_id is null
  and coalesce(p.category, '') <> ''
  and lower(c.name) = lower(p.category);

create unique index if not exists products_slug_unique_idx
  on public.products (slug);

create index if not exists products_category_id_idx
  on public.products (category_id);
