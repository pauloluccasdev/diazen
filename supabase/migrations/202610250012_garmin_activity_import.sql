-- Importação autorizada de atividades Garmin, com origem e sincronização idempotentes.
begin;
alter table public.activities add column name text check(length(name) between 1 and 200);
alter table public.activities add column kcal numeric(10,2) check(kcal between 0 and 100000);
alter table public.activities add column external_provider text check(external_provider='garmin');
alter table public.activities add column external_id text check(external_id ~ '^[0-9]{1,20}$');
alter table public.activities add column external_type text check(length(external_type) between 1 and 60);
alter table public.activities drop constraint activities_modality_check;
alter table public.activities add constraint activities_modality_check check(modality in ('strength','running','cycling','swimming','other'));
alter table public.activities drop constraint activities_distance_km_check;
alter table public.activities add constraint activities_distance_km_check check(distance_km <= 1000 and (distance_km > 0 or (distance_km=0 and coalesce(external_provider='garmin',false))));
alter table public.activities drop constraint activities_check;
alter table public.activities add constraint activities_distance_required check(modality in ('strength','other') or distance_km is not null or coalesce(external_provider='garmin',false));
alter table public.activities add constraint activities_external_origin check(
  (external_provider is null and external_id is null and external_type is null)
  or (external_provider is not null and external_id is not null and external_type is not null));
create unique index activities_external_unique on public.activities(user_id,external_provider,external_id) where external_id is not null;

create table public.garmin_sync_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 auto_after timestamptz not null default now(),
 last_success_at timestamptz,
 scan_offset integer not null default 0 check(scan_offset between 0 and 100000),
 lease_id uuid,
 lease_until timestamptz
);
create table public.garmin_imports (
 user_id uuid not null references auth.users(id) on delete cascade,
 external_id text not null check(external_id ~ '^[0-9]{1,20}$'),
 activity_id uuid references public.activities(id) on delete set null,
 imported_at timestamptz not null default now(),
 primary key(user_id,external_id)
);
alter table public.garmin_sync_settings enable row level security;
alter table public.garmin_imports enable row level security;
revoke all on public.garmin_sync_settings,public.garmin_imports from public,anon,authenticated;
grant select on public.garmin_sync_settings,public.garmin_imports to authenticated;
grant update(enabled) on public.garmin_sync_settings to authenticated;
create policy garmin_settings_read on public.garmin_sync_settings for select to authenticated using(user_id=auth.uid() and private.owner_enabled(auth.uid()));
create policy garmin_settings_update on public.garmin_sync_settings for update to authenticated using(user_id=auth.uid() and private.owner_enabled(auth.uid())) with check(user_id=auth.uid() and private.owner_enabled(auth.uid()));
create policy garmin_imports_read on public.garmin_imports for select to authenticated using(user_id=auth.uid() and private.owner_enabled(auth.uid()));

create function private.guard_activity_origin() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' and new.external_provider is not null and current_user not in ('postgres','service_role') then raise exception 'Origem requer importação verificada';end if;
 if tg_op='UPDATE' and (new.external_provider is distinct from old.external_provider or new.external_id is distinct from old.external_id or new.external_type is distinct from old.external_type) then raise exception 'Origem imutável';end if;
 return new;
end $$;
revoke all on function private.guard_activity_origin() from public;
create trigger zz_guard_activity_origin before insert or update on public.activities for each row execute function private.guard_activity_origin();

-- Somente o backend pode fornecer dados obtidos diretamente da Garmin.
create function public.garmin_import_activity(p_user uuid,p_data jsonb,p_lease uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.projects; settings public.garmin_sync_settings; origin text; result_id uuid; d date; minutes numeric; km numeric; calories numeric; previous_claim text;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) or exists(select 1 from public.account_deletions where user_id=p_user) then raise exception 'Conta indisponível';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into p from public.projects where user_id=p_user and status='ACTIVE' for update;
 if p.id is null then return jsonb_build_object('status','no_active_project');end if;
 if p_lease is not null then
  select * into settings from public.garmin_sync_settings where user_id=p_user for update;
  if not found or not settings.enabled or settings.lease_id is distinct from p_lease or settings.lease_until is null or settings.lease_until<=now() then return jsonb_build_object('status','paused');end if;
  if nullif(p_data->>'startedAt','') is null or (p_data->>'startedAt')::timestamptz<settings.auto_after then return jsonb_build_object('status','before_activation');end if;
 end if;
 origin:=p_data->>'id';
 if origin is null or origin !~ '^[0-9]{1,20}$' or length(coalesce(p_data->>'name','')) not between 1 and 200 or length(coalesce(p_data->>'sport','')) not between 1 and 60 or coalesce(p_data->>'date','') !~ '^\d{4}-\d{2}-\d{2}' then return jsonb_build_object('status','needs_review');end if;
 select activity_id into result_id from public.garmin_imports where user_id=p_user and external_id=origin;
 if found then return jsonb_build_object('status','already_imported','id',result_id);end if;
 d:=left(p_data->>'date',10)::date;
 if d<p.starts_on or (p.ends_on is not null and d>p.ends_on) or d>(now() at time zone 'America/Sao_Paulo')::date then return jsonb_build_object('status','outside_project');end if;
 minutes:=round((p_data->>'seconds')::numeric/60,2);
 km:=round((p_data->>'metres')::numeric/1000,3);
 calories:=(p_data->>'calories')::numeric;
 if minutes is null or minutes<=0 or minutes>1440 or (km is not null and (km<0 or km>1000)) or (calories is not null and (calories<0 or calories>100000)) or coalesce(p_data->>'modality','') not in ('strength','running','cycling','swimming','other') then return jsonb_build_object('status','needs_review');end if;
 previous_claim:=current_setting('request.jwt.claim.sub',true);
 perform set_config('request.jwt.claim.sub',p_user::text,true);
 insert into public.activities(logged_on,modality,duration_min,distance_km,name,kcal,external_provider,external_id,external_type)
 values(d,p_data->>'modality',minutes,km,p_data->>'name',calories,'garmin',origin,p_data->>'sport') returning id into result_id;
 insert into public.garmin_imports(user_id,external_id,activity_id) values(p_user,origin,result_id);
 perform set_config('request.jwt.claim.sub',coalesce(previous_claim,''),true);
 return jsonb_build_object('status','imported','id',result_id);
end $$;

create function public.garmin_claim_sync(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.garmin_sync_settings; p public.projects; claim uuid;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) or exists(select 1 from public.account_deletions where user_id=p_user) then return null;end if;
 select * into p from public.projects where user_id=p_user and status='ACTIVE';
 if p.id is null then return null;end if;
 insert into public.garmin_sync_settings(user_id) values(p_user) on conflict do nothing;
 select * into s from public.garmin_sync_settings where user_id=p_user for update;
 if not s.enabled or s.lease_until>now() or s.last_success_at>now()-interval '5 minutes' then return null;end if;
 claim:=gen_random_uuid();
 update public.garmin_sync_settings set lease_id=claim,lease_until=now()+interval '90 seconds' where user_id=p_user;
 return jsonb_build_object('lease',claim,'after',s.auto_after,'offset',s.scan_offset);
end $$;
create function public.garmin_finish_sync(p_user uuid,p_lease uuid,p_success boolean,p_offset integer default 0) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.garmin_sync_settings set lease_id=null,lease_until=null,last_success_at=case when p_success then now() else last_success_at end,scan_offset=case when p_success then p_offset else scan_offset end where user_id=p_user and lease_id=p_lease;
end $$;
revoke all on function public.garmin_import_activity(uuid,jsonb,uuid),public.garmin_claim_sync(uuid),public.garmin_finish_sync(uuid,uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.garmin_import_activity(uuid,jsonb,uuid),public.garmin_claim_sync(uuid),public.garmin_finish_sync(uuid,uuid,boolean,integer) to service_role;
commit;
