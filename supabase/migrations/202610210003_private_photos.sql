begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('body-photos','body-photos',false,3145728,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/webp'];
-- Upload e remoção somente pelo backend após validar identidade/estado. A chave
-- administrativa nunca é enviada ao cliente. SELECT exige registro proprietário.
create policy diazen_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'body-photos' and exists (
    select 1 from public.photos p where private.owner_enabled(p.user_id)
      and (p.storage_key = name or p.thumbnail_key = name)
  )
);
commit;
