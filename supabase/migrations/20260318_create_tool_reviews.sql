create table if not exists public.tool_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  tool_type text not null check (tool_type in ('custom-print','lithophane')),
  reviewer_name text,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  is_approved boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.tool_reviews enable row level security;

create policy "read approved tool reviews"
on public.tool_reviews
for select
using (is_approved = true);

create policy "insert own tool reviews"
on public.tool_reviews
for insert
to authenticated
with check (auth.uid() = user_id);
