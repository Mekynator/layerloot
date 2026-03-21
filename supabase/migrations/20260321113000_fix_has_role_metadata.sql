-- Ensure admin checks work in projects that use auth app_metadata roles.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = _user_id
        and ur.role = _role
    )
    or exists (
      select 1
      from auth.users u
      where u.id = _user_id
        and (
          coalesce(u.raw_app_meta_data ->> 'role', '') = _role::text
          or (u.raw_app_meta_data -> 'roles') ? (_role::text)
        )
    )
  );
$$;
