create index if not exists idx_user_vouchers_recipient_email_lower
on public.user_vouchers (lower(recipient_email));

drop policy if exists "Gift recipients view vouchers" on public.user_vouchers;

create policy "Gift recipients view vouchers"
on public.user_vouchers
for select
to authenticated
using (
  recipient_email is not null
  and lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
