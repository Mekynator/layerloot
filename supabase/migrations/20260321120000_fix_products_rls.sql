-- Ensure admin write access to products through RLS.

alter table public.products enable row level security;

-- Keep policy names stable and deterministic.
drop policy if exists "Anyone can view active products" on public.products;
drop policy if exists "Admins view all products" on public.products;
drop policy if exists "Admins manage products" on public.products;

create policy "Anyone can view active products"
on public.products
for select
to public
using (is_active = true);

create policy "Admins view all products"
on public.products
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins insert products"
on public.products
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins update products"
on public.products
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins delete products"
on public.products
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));
