-- Ensure custom order checkout-related columns exist.

alter table public.custom_orders
  add column if not exists request_fee_amount numeric(10,2) not null default 100,
  add column if not exists request_fee_status text not null default 'unpaid',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz;

-- Backfill legacy rows safely.
update public.custom_orders
set request_fee_amount = coalesce(request_fee_amount, 100)
where request_fee_amount is null;

update public.custom_orders
set request_fee_status = coalesce(nullif(request_fee_status, ''), 'unpaid')
where request_fee_status is null or request_fee_status = '';

-- Optional guard-rail values.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_orders_request_fee_status_check'
  ) then
    alter table public.custom_orders
      add constraint custom_orders_request_fee_status_check
      check (request_fee_status in ('unpaid', 'paid'));
  end if;
end $$;
