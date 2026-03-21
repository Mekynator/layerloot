insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

update storage.buckets
set public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'review-images';

drop policy if exists "Anyone can view review images" on storage.objects;
drop policy if exists "Authenticated users upload review images" on storage.objects;
drop policy if exists "Admins manage review images" on storage.objects;

create policy "Anyone can view review images"
on storage.objects for select
to public
using (bucket_id = 'review-images');

create policy "Authenticated users upload review images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'review-images');

create policy "Admins manage review images"
on storage.objects for delete
to authenticated
using (bucket_id = 'review-images' and public.has_role(auth.uid(), 'admin'));
