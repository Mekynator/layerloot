insert into public.loyalty_points (user_id, points, reason)
select
  co.user_id,
  floor(coalesce(co.request_fee_amount, 0) / 4.0)::int as points,
  'Custom request fee #' || left(co.id::text, 8) as reason
from public.custom_orders co
where co.user_id is not null
  and co.request_fee_status = 'paid'
  and co.request_fee_amount is not null
  and co.request_fee_amount > 0
  and floor(co.request_fee_amount / 4.0) > 0
  and not exists (
    select 1
    from public.loyalty_points lp
    where lp.user_id = co.user_id
      and lp.reason = 'Custom request fee #' || left(co.id::text, 8)
  );
