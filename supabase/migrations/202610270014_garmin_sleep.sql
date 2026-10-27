-- Sono Garmin: adesão independente, dados privados e atualização idempotente por dia.
begin;
create table public.garmin_sleep_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 enabled_at timestamptz,
 last_attempt_at timestamptz,
 last_success_at timestamptz,
 last_error_at timestamptz,
 lease_id uuid,
 lease_until timestamptz
);
create table public.sleep_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid not null,
 logged_on date not null,
 total_seconds integer check(total_seconds between 0 and 86400),
 nap_seconds integer check(nap_seconds between 0 and 86400),
 deep_seconds integer check(deep_seconds between 0 and 86400),
 light_seconds integer check(light_seconds between 0 and 86400),
 rem_seconds integer check(rem_seconds between 0 and 86400),
 awake_seconds integer check(awake_seconds between 0 and 86400),
 score integer check(score between 0 and 100),
 started_at timestamptz,
 ended_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(user_id,logged_on),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
create index sleep_records_project_date on public.sleep_records(user_id,project_id,logged_on desc);
alter table public.garmin_sleep_settings enable row level security;
alter table public.sleep_records enable row level security;
revoke all on public.garmin_sleep_settings,public.sleep_records from public,anon,authenticated;
grant select(user_id,enabled,enabled_at,last_attempt_at,last_success_at,last_error_at) on public.garmin_sleep_settings to authenticated;
grant select on public.sleep_records to authenticated;
grant all on public.garmin_sleep_settings,public.sleep_records to service_role;
create policy sleep_settings_owner on public.garmin_sleep_settings for select to authenticated using(user_id=(select auth.uid()) and private.owner_enabled(user_id));
create policy sleep_records_owner on public.sleep_records for select to authenticated using(user_id=(select auth.uid()) and private.owner_enabled(user_id));

create function public.set_garmin_sleep_sync(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid();
begin
 if u is null or p_enabled is null or not private.owner_enabled(u) then raise exception 'Conta indisponível';end if;
 insert into public.garmin_sleep_settings(user_id,enabled,enabled_at) values(u,p_enabled,case when p_enabled then now() end)
 on conflict(user_id) do update set enabled=excluded.enabled,
 enabled_at=case when excluded.enabled and not garmin_sleep_settings.enabled then now() else garmin_sleep_settings.enabled_at end,
 last_attempt_at=case when excluded.enabled and not garmin_sleep_settings.enabled then null else garmin_sleep_settings.last_attempt_at end,
 lease_id=case when not excluded.enabled then null else garmin_sleep_settings.lease_id end,
 lease_until=case when not excluded.enabled then null else garmin_sleep_settings.lease_until end;
end $$;
revoke all on function public.set_garmin_sleep_sync(boolean) from public,anon;
grant execute on function public.set_garmin_sleep_sync(boolean) to authenticated;

create function public.garmin_claim_sleep(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.garmin_sleep_settings; p public.projects; claim uuid; d date := (now() at time zone 'America/Sao_Paulo')::date; first_day date; last_day date;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) or exists(select 1 from public.account_deletions where user_id=p_user) then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into p from public.projects where user_id=p_user and status='ACTIVE' for update;
 if p.id is null then return null;end if;
 first_day:=greatest(d-2,p.starts_on);last_day:=least(d,coalesce(p.ends_on,d));
 if first_day>last_day then return null;end if;
 select * into s from public.garmin_sleep_settings where user_id=p_user for update;
 if s.user_id is null or not s.enabled or s.lease_until>now() or s.last_attempt_at>now()-interval '14 minutes' then return null;end if;
 claim:=gen_random_uuid();
 update public.garmin_sleep_settings set lease_id=claim,lease_until=now()+interval '90 seconds',last_attempt_at=now() where user_id=p_user;
 return jsonb_build_object('lease',claim,'from',first_day,'to',last_day);
end $$;
create function public.garmin_store_sleep(p_user uuid,p_lease uuid,p_data jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare p public.projects; d date; changed uuid;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) or exists(select 1 from public.account_deletions where user_id=p_user) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into p from public.projects where user_id=p_user and status='ACTIVE' for update;
 if p.id is null or not exists(select 1 from public.garmin_sleep_settings where user_id=p_user and enabled and lease_id=p_lease and lease_until>now()) then return false;end if;
 if coalesce(p_data->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then return false;end if;
 d:=(p_data->>'date')::date;
 if d<p.starts_on or (p.ends_on is not null and d>p.ends_on) or d>(now() at time zone 'America/Sao_Paulo')::date or d<(now() at time zone 'America/Sao_Paulo')::date-2 then return false;end if;
 insert into public.sleep_records(user_id,project_id,logged_on,total_seconds,nap_seconds,deep_seconds,light_seconds,rem_seconds,awake_seconds,score,started_at,ended_at)
 values(p_user,p.id,d,(p_data->>'total_seconds')::integer,(p_data->>'nap_seconds')::integer,(p_data->>'deep_seconds')::integer,(p_data->>'light_seconds')::integer,(p_data->>'rem_seconds')::integer,(p_data->>'awake_seconds')::integer,(p_data->>'score')::integer,(p_data->>'started_at')::timestamptz,(p_data->>'ended_at')::timestamptz)
 on conflict(user_id,logged_on) do update set total_seconds=excluded.total_seconds,nap_seconds=excluded.nap_seconds,deep_seconds=excluded.deep_seconds,light_seconds=excluded.light_seconds,rem_seconds=excluded.rem_seconds,awake_seconds=excluded.awake_seconds,score=excluded.score,started_at=excluded.started_at,ended_at=excluded.ended_at,updated_at=now()
 where sleep_records.project_id=excluded.project_id and
 (sleep_records.total_seconds,sleep_records.nap_seconds,sleep_records.deep_seconds,sleep_records.light_seconds,sleep_records.rem_seconds,sleep_records.awake_seconds,sleep_records.score,sleep_records.started_at,sleep_records.ended_at)
 is distinct from (excluded.total_seconds,excluded.nap_seconds,excluded.deep_seconds,excluded.light_seconds,excluded.rem_seconds,excluded.awake_seconds,excluded.score,excluded.started_at,excluded.ended_at)
 returning id into changed;
 return changed is not null;
end $$;
create function public.garmin_finish_sleep(p_user uuid,p_lease uuid,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.garmin_sleep_settings set lease_id=null,lease_until=null,last_success_at=case when p_success then now() else last_success_at end,last_error_at=case when p_success then null else now() end where user_id=p_user and lease_id=p_lease;
end $$;
revoke all on function public.garmin_claim_sleep(uuid),public.garmin_store_sleep(uuid,uuid,jsonb),public.garmin_finish_sleep(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.garmin_claim_sleep(uuid),public.garmin_store_sleep(uuid,uuid,jsonb),public.garmin_finish_sleep(uuid,uuid,boolean) to service_role;
commit;
