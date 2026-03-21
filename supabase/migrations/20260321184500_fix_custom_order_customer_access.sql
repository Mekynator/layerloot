create or replace function public.can_access_custom_order(_order_user_id uuid, _order_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() = _order_user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(_order_email, ''));
$$;

update public.custom_orders co
set user_id = au.id
from auth.users au
where lower(coalesce(co.email, '')) = lower(coalesce(au.email, ''))
  and co.user_id is distinct from au.id;

drop policy if exists "Users view own custom orders" on public.custom_orders;
create policy "Users view own custom orders"
on public.custom_orders
for select
to authenticated
using (public.can_access_custom_order(user_id, email));

drop policy if exists "Users update own custom orders" on public.custom_orders;
create policy "Users update own custom orders"
on public.custom_orders
for update
to authenticated
using (public.can_access_custom_order(user_id, email))
with check (public.can_access_custom_order(user_id, email));

drop policy if exists "Users view own custom order messages" on public.custom_order_messages;
drop policy if exists "Users can read their own custom order messages" on public.custom_order_messages;
create policy "Users can read their own custom order messages"
on public.custom_order_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.custom_orders co
    where co.id = custom_order_messages.custom_order_id
      and public.can_access_custom_order(co.user_id, co.email)
  )
);

drop policy if exists "Users insert own custom order messages" on public.custom_order_messages;
drop policy if exists "Users can insert messages on their own custom orders" on public.custom_order_messages;
create policy "Users can insert messages on their own custom orders"
on public.custom_order_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_role = 'user'
  and exists (
    select 1
    from public.custom_orders co
    where co.id = custom_order_messages.custom_order_id
      and public.can_access_custom_order(co.user_id, co.email)
  )
);
