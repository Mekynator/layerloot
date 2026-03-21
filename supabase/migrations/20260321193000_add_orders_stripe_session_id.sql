alter table public.orders
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists orders_stripe_checkout_session_id_key
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
