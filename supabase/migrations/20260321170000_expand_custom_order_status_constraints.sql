-- Align custom order status constraints with the statuses used by the app and webhooks.

alter table public.custom_orders
  drop constraint if exists custom_orders_status_check;

alter table public.custom_orders
  add constraint custom_orders_status_check
  check (
    status in (
      'pending',
      'awaiting_request_fee',
      'payment_pending',
      'pending_review',
      'reviewing',
      'quoted',
      'accepted',
      'paid',
      'completed',
      'rejected',
      'cancelled'
    )
  );

alter table public.custom_orders
  drop constraint if exists custom_orders_request_fee_status_check;

alter table public.custom_orders
  add constraint custom_orders_request_fee_status_check
  check (request_fee_status in ('unpaid', 'paid', 'failed'));
