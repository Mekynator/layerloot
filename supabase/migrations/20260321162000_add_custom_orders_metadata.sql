-- Add missing metadata payload for custom order flows
alter table public.custom_orders
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.custom_orders.metadata is 'Flexible JSON payload for custom order attachments, estimates, and workflow context.';
