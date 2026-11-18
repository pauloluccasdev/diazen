-- Ampliação aditiva aprovada: recipientes da conta, sem modificar consumos.
begin;
create table public.water_containers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60),
 volume_ml integer not null check(volume_ml between 1 and 5000),
 created_at timestamptz not null default now()
);
create index water_containers_owner on public.water_containers(user_id,created_at,id);
alter table public.water_containers enable row level security;
revoke all on public.water_containers from public,anon,authenticated;
grant select,insert,update,delete on public.water_containers to authenticated;
grant all on public.water_containers to service_role;
create policy own_data on public.water_containers to authenticated
 using (user_id=(select auth.uid()) and private.owner_enabled(user_id))
 with check (user_id=(select auth.uid()) and private.owner_enabled(user_id));

create function private.guard_water_container() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('postgres','service_role','supabase_auth_admin') then
  if TG_OP='DELETE' then return old;end if;
  return new;
 end if;
 if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível';end if;
 if TG_OP='DELETE' then return old;end if;
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.created_at<>old.created_at then
   raise exception 'Identidade imutável';
  end if;
 else
  -- Serializa o limite inclusive para inserções concorrentes da mesma conta.
  perform pg_advisory_xact_lock(hashtextextended('diazen:water-containers:'||auth.uid()::text,0));
  if (select count(*) from public.water_containers where user_id=auth.uid())>=50 then
   raise exception 'Limite de 50 recipientes';
  end if;
  new.created_at:=now();
 end if;
 new.name:=trim(new.name);
 return new;
end $$;
revoke all on function private.guard_water_container() from public;
create trigger guard_water_container before insert or update or delete on public.water_containers
 for each row execute function private.guard_water_container();
create trigger audit_change after insert or update or delete on public.water_containers
 for each row execute function private.audit_change();
commit;
