begin;
create table public.photo_cleanup (
  photo_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  paths text[] not null, created_at timestamptz not null default now()
);
alter table public.photo_cleanup enable row level security;
-- Somente backend administrativo. Nenhuma policy ou grant a usuário final.
create function private.queue_photo_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from auth.users where id=old.user_id) then
    insert into public.photo_cleanup(photo_id,user_id,paths) values(old.id,old.user_id,array[old.storage_key,old.thumbnail_key]) on conflict do nothing;
  end if;
  return null;
end $$;
revoke all on function private.queue_photo_cleanup() from public;
create trigger queue_photo_cleanup after delete on public.photos for each row execute function private.queue_photo_cleanup();
commit;
