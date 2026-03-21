-- 20260318_custom_order_negotiation_system.sql
-- Step 1: extend custom_orders and add conversation table for custom print workflow

create or replace function public.is_admin(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = _uid
      and (
        coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
        or (u.raw_app_meta_data -> 'roles') ? 'admin'
      )
  );
$$;

alter table public.custom_orders
add column if not exists quoted_price numeric(10,2),
add column if not exists customer_offer_price numeric(10,2),
add column if not exists final_agreed_price numeric(10,2),
add column if not exists customer_response_status text default 'pending',
add column if not exists payment_status text default 'unpaid',
add column if not exists production_status text default 'pending';

alter table public.custom_orders
drop constraint if exists custom_orders_customer_response_status_check;

alter table public.custom_orders
add constraint custom_orders_customer_response_status_check
check (customer_response_status in ('pending', 'accepted', 'declined', 'countered'));

alter table public.custom_orders
drop constraint if exists custom_orders_payment_status_check;

alter table public.custom_orders
add constraint custom_orders_payment_status_check
check (payment_status in ('unpaid', 'awaiting_payment', 'paid', 'refunded', 'cancelled'));

alter table public.custom_orders
drop constraint if exists custom_orders_production_status_check;

alter table public.custom_orders
add constraint custom_orders_production_status_check
check (production_status in ('pending', 'queued', 'in_production', 'completed', 'shipped', 'cancelled'));

create table if not exists public.custom_order_messages (
  id uuid primary key default gen_random_uuid(),
  custom_order_id uuid not null references public.custom_orders(id) on delete cascade,
  sender_role text not null,
  sender_user_id uuid references auth.users(id) on delete set null,
  message text,
  message_type text not null default 'note',
  proposed_price numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.custom_order_messages
drop constraint if exists custom_order_messages_sender_role_check;

alter table public.custom_order_messages
add constraint custom_order_messages_sender_role_check
check (sender_role in ('user', 'admin', 'system'));

alter table public.custom_order_messages
drop constraint if exists custom_order_messages_message_type_check;

alter table public.custom_order_messages
add constraint custom_order_messages_message_type_check
check (message_type in ('note', 'quote', 'counter_offer', 'status_update', 'system'));

alter table public.custom_order_messages enable row level security;

drop policy if exists "Users can read their own custom order messages" on public.custom_order_messages;
create policy "Users can read their own custom order messages"
on public.custom_order_messages
for select
using (
  exists (
    select 1
    from public.custom_orders co
    where co.id = custom_order_messages.custom_order_id
      and co.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert messages on their own custom orders" on public.custom_order_messages;
create policy "Users can insert messages on their own custom orders"
on public.custom_order_messages
for insert
with check (
  sender_user_id = auth.uid()
  and sender_role = 'user'
  and exists (
    select 1
    from public.custom_orders co
    where co.id = custom_order_messages.custom_order_id
      and co.user_id = auth.uid()
  )
);

drop policy if exists "Admins can read all custom order messages" on public.custom_order_messages;
create policy "Admins can read all custom order messages"
on public.custom_order_messages
for select
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can insert custom order messages" on public.custom_order_messages;
create policy "Admins can insert custom order messages"
on public.custom_order_messages
for insert
with check (
  public.is_admin(auth.uid())
  and sender_role in ('admin', 'system')
);

drop policy if exists "Admins can update custom order messages" on public.custom_order_messages;
create policy "Admins can update custom order messages"
on public.custom_order_messages
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Optional seed system message for existing orders
insert into public.custom_order_messages (custom_order_id, sender_role, message, message_type)
select co.id, 'system', 'Custom order created.', 'system'
from public.custom_orders co
where not exists (
  select 1 from public.custom_order_messages m where m.custom_order_id = co.id
);
