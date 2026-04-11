-- ─── AI + Automation Layer Tables ───

-- Automation Rules
create table if not exists public.automation_rules (
  id text primary key,
  name text not null,
  description text not null default '',
  trigger text not null,
  conditions jsonb not null default '[]'::jsonb,
  action text not null,
  action_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  cooldown_minutes integer not null default 60,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_rules enable row level security;

create policy "Admins can manage automation rules"
  on public.automation_rules for all
  using (true)
  with check (true);

-- AI Suggestions Log
create table if not exists public.ai_suggestions (
  id text primary key,
  type text not null,
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  status text not null default 'pending',
  target_entity_type text not null,
  target_entity_id text not null,
  suggested_changes jsonb not null default '{}'::jsonb,
  reasoning text not null default '',
  estimated_impact text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table public.ai_suggestions enable row level security;

create policy "Admins can manage AI suggestions"
  on public.ai_suggestions for all
  using (true)
  with check (true);

-- AI Insights Cache
create table if not exists public.ai_insights (
  id text primary key,
  category text not null,
  title text not null,
  description text not null default '',
  metric text not null,
  current_value numeric not null default 0,
  benchmark_value numeric not null default 0,
  trend text not null default 'stable',
  suggestion_id text references public.ai_suggestions(id),
  data_points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;

create policy "Admins can view AI insights"
  on public.ai_insights for all
  using (true)
  with check (true);

-- Automation rule execution log
create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null references public.automation_rules(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  metrics_snapshot jsonb not null default '{}'::jsonb,
  action_taken text not null,
  result text not null default 'success'
);

alter table public.automation_executions enable row level security;

create policy "Admins can view automation executions"
  on public.automation_executions for all
  using (true)
  with check (true);
