-- Ampliação aditiva aprovada: nome opcional e avatar privado da conta.
begin;
create table public.profiles (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 display_name text check(display_name is null or
   (length(display_name) between 1 and 80 and display_name=btrim(display_name) and display_name !~ '[[:cntrl:]]')),
 avatar_id uuid,
 avatar_key text generated always as
   (case when avatar_id is null then null else user_id::text||'/avatars/'||avatar_id::text||'.webp' end) stored,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;
grant insert(user_id,display_name,avatar_id),update(display_name,avatar_id) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_profile on public.profiles to authenticated
 using(user_id=(select auth.uid()) and private.owner_enabled(user_id))
 with check(user_id=(select auth.uid()) and private.owner_enabled(user_id));

create table public.avatar_cleanup (
 user_id uuid not null references auth.users(id) on delete cascade,
 avatar_id uuid not null,
 storage_key text generated always as (user_id::text||'/avatars/'||avatar_id::text||'.webp') stored,
 created_at timestamptz not null default now(),
 available_after timestamptz not null default now(),
 revision bigint not null default 1 check(revision>0),
 primary key(user_id,avatar_id)
);
create index avatar_cleanup_ready on public.avatar_cleanup(available_after,created_at);
alter table public.avatar_cleanup enable row level security;
revoke all on public.avatar_cleanup from public,anon,authenticated;
grant all on public.avatar_cleanup to service_role;

create function private.guard_profile() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at) then
  raise exception 'Identidade imutável';
 end if;
 if current_user not in ('postgres','service_role','supabase_auth_admin') and not private.owner_enabled(new.user_id) then
  raise exception 'Conta indisponível';
 end if;
 new.display_name:=nullif(btrim(new.display_name),'');
 if TG_OP='INSERT' then new.created_at:=now();end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function private.guard_profile() from public,anon,authenticated;
create trigger guard_profile before insert or update on public.profiles
 for each row execute function private.guard_profile();

create function private.audit_profile_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 owner_id:=case when TG_OP='DELETE' then old.user_id else new.user_id end;
 if exists(select 1 from auth.users where id=owner_id) then
  insert into public.audit_events(user_id,project_id,entity,entity_id,action)
  values(owner_id,null,'profiles',owner_id,TG_OP);
 end if;
 return null;
end $$;
revoke all on function private.audit_profile_change() from public,anon,authenticated;
create trigger audit_profile_change after insert or update or delete on public.profiles
 for each row execute function private.audit_profile_change();

create function private.queue_avatar_cleanup() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.avatar_id is null then return null;end if;
 if TG_OP='UPDATE' and new.avatar_id is not distinct from old.avatar_id then return null;end if;
 if exists(select 1 from auth.users where id=old.user_id) then
  insert into public.avatar_cleanup as jobs(user_id,avatar_id,available_after)
  values(old.user_id,old.avatar_id,now())
  on conflict(user_id,avatar_id) do update
    set available_after=least(jobs.available_after,excluded.available_after),revision=jobs.revision+1;
 end if;
 return null;
end $$;
revoke all on function private.queue_avatar_cleanup() from public,anon,authenticated;
create trigger queue_avatar_cleanup after update or delete on public.profiles
 for each row execute function private.queue_avatar_cleanup();

create function public.save_profile_name(p_name text default null) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível';end if;
 insert into public.profiles(user_id,display_name) values(auth.uid(),nullif(btrim(p_name),''))
 on conflict(user_id) do update set display_name=excluded.display_name;
end $$;
create function public.set_profile_avatar(p_avatar uuid default null,p_initial_name text default null) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível';end if;
 insert into public.profiles(user_id,avatar_id,display_name) values(auth.uid(),p_avatar,nullif(btrim(p_initial_name),''))
 on conflict(user_id) do update set avatar_id=excluded.avatar_id;
end $$;
create function public.remove_profile_avatar(p_avatar uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível';end if;
 update public.profiles set avatar_id=null where user_id=auth.uid() and avatar_id=p_avatar;
 get diagnostics changed=row_count;
 return changed>0;
end $$;
revoke all on function public.save_profile_name(text),public.set_profile_avatar(uuid,text),public.remove_profile_avatar(uuid) from public,anon;
grant execute on function public.save_profile_name(text),public.set_profile_avatar(uuid,text),public.remove_profile_avatar(uuid) to authenticated;

create policy diazen_avatar_read on storage.objects for select to authenticated using (
 bucket_id='body-photos' and exists (
  select 1 from public.profiles p where private.owner_enabled(p.user_id) and p.avatar_key=storage.objects.name
 )
);
commit;
