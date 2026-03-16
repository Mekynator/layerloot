-- LayerLoot cart upgrade schema
-- Adapt names to your existing schema if some tables already exist.

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  quantity integer not null default 1 check (quantity > 0),
  variant_data jsonb,
  custom_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  quantity integer not null default 1 check (quantity > 0),
  variant_data jsonb,
  custom_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_discount_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  title text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null,
  minimum_order_value numeric(10,2),
  expires_at timestamptz,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  recommended_product_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, recommended_product_id)
);

-- Optional product metadata columns for manufacturing info.
alter table public.products
  add column if not exists print_time_hours numeric(10,2),
  add column if not exists material_grams numeric(10,2),
  add column if not exists dispatch_note text,
  add column if not exists free_shipping_eligible boolean default false;

alter table public.cart_items enable row level security;
alter table public.saved_items enable row level security;
alter table public.user_discount_codes enable row level security;

create policy if not exists "cart_items_select_own"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy if not exists "cart_items_insert_own"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy if not exists "cart_items_update_own"
  on public.cart_items for update
  using (auth.uid() = user_id);

create policy if not exists "cart_items_delete_own"
  on public.cart_items for delete
  using (auth.uid() = user_id);

create policy if not exists "saved_items_select_own"
  on public.saved_items for select
  using (auth.uid() = user_id);

create policy if not exists "saved_items_insert_own"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

create policy if not exists "saved_items_update_own"
  on public.saved_items for update
  using (auth.uid() = user_id);

create policy if not exists "saved_items_delete_own"
  on public.saved_items for delete
  using (auth.uid() = user_id);

create policy if not exists "discount_codes_select_own"
  on public.user_discount_codes for select
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute procedure public.set_updated_at();
