create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  event_name text not null,
  event_category text not null default 'engagement',
  page_path text null,
  page_title text null,
  surface text not null default 'storefront',
  device_type text null,
  entity_type text null,
  entity_id text null,
  parent_entity_id text null,
  reusable_id uuid null references public.reusable_blocks(id) on delete set null,
  component_id uuid null references public.reusable_blocks(id) on delete set null,
  popup_id text null,
  campaign_id uuid null references public.campaigns(id) on delete set null,
  source text null,
  value numeric null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_page_path_idx on public.analytics_events (page_path);
create index if not exists analytics_events_entity_idx on public.analytics_events (entity_type, entity_id);
create index if not exists analytics_events_reusable_idx on public.analytics_events (reusable_id);
create index if not exists analytics_events_component_idx on public.analytics_events (component_id);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);

create table if not exists public.analytics_daily_aggregates (
  id uuid primary key default gen_random_uuid(),
  aggregate_date date not null,
  event_name text not null,
  page_path text null,
  entity_type text null,
  entity_id text null,
  device_type text null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_daily_aggregates_unique_idx
  on public.analytics_daily_aggregates (aggregate_date, event_name, coalesce(page_path, ''), coalesce(entity_type, ''), coalesce(entity_id, ''), coalesce(device_type, ''));

alter table public.analytics_events enable row level security;
alter table public.analytics_daily_aggregates enable row level security;

drop policy if exists "Analytics events are insertable by anyone" on public.analytics_events;
create policy "Analytics events are insertable by anyone"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read analytics events" on public.analytics_events;
create policy "Authenticated users can read analytics events"
  on public.analytics_events
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read daily analytics aggregates" on public.analytics_daily_aggregates;
create policy "Authenticated users can read daily analytics aggregates"
  on public.analytics_daily_aggregates
  for select
  to authenticated
  using (true);
