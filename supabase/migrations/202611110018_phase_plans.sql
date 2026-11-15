-- Planos manuais e referências visuais privadas; nenhuma prescrição automática.
begin;
create table public.plan_assets (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),project_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 120),storage_key text not null unique,created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
 check(storage_key=user_id::text||'/'||project_id::text||'/'||id::text||'.webp')
);
create table public.phase_plans (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),project_id uuid not null,
 phase_id uuid references public.project_phases(id) on delete set null,
 reference_image_id uuid references public.plan_assets(id) on delete set null,
 valid_until date,phase_name text,
 kind text not null check(kind in ('hydration','strength')),title text not null check(length(trim(title)) between 1 and 120),effective_from date not null,
 document jsonb not null check((jsonb_typeof(document)='object' and document->>'version'='1' and octet_length(document::text)<=100000) is true),
 created_at timestamptz not null default now(),foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
create index phase_plans_validity on public.phase_plans(user_id,project_id,kind,effective_from desc,created_at desc);
alter table public.diet_plans add column valid_until date;
alter table public.diet_plans add column phase_name text;
alter table public.diet_plans add column phase_id uuid references public.project_phases(id) on delete set null;
alter table public.diet_plans add column reference_image_id uuid references public.plan_assets(id) on delete set null;
create function private.guard_plan_references() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.projects;
begin
 select * into p from public.projects where id=new.project_id and user_id=auth.uid() for update;
 if p.id is null or p.status not in ('DRAFT','ACTIVE') or not private.owner_enabled(auth.uid()) then raise exception 'Projeto indisponível';end if;
 if new.effective_from<p.starts_on or (p.ends_on is not null and new.effective_from>p.ends_on) then raise exception 'Vigência inválida';end if;
 if new.phase_id is not null and not exists(select 1 from public.project_phases f where f.id=new.phase_id and f.user_id=auth.uid() and f.project_id=p.id and new.effective_from between f.starts_on and f.ends_on) then raise exception 'Fase indisponível';end if;
 if new.reference_image_id is not null and not exists(select 1 from public.plan_assets a where a.id=new.reference_image_id and a.user_id=auth.uid() and a.project_id=p.id) then raise exception 'Referência indisponível';end if;
 if new.phase_id is not null then select ends_on,name into new.valid_until,new.phase_name from public.project_phases where id=new.phase_id;else new.valid_until:=p.ends_on;new.phase_name:=null;end if;
 new.user_id:=auth.uid();new.created_at:=now();return new;
end $$;
revoke all on function private.guard_plan_references() from public;
create trigger guard_plan_references before insert on public.phase_plans for each row execute function private.guard_plan_references();
create trigger zz_guard_plan_references before insert on public.diet_plans for each row execute function private.guard_plan_references();
create function private.guard_plan_asset() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.projects;
begin
 if tg_op='DELETE' and current_user in ('postgres','service_role','supabase_auth_admin') then return old;end if;
 if tg_op='INSERT' then
  select * into p from public.projects where user_id=auth.uid() and status='ACTIVE' for update;
  if p.id is null or not private.owner_enabled(auth.uid()) then raise exception 'Projeto indisponível';end if;
  if exists(select 1 from public.photos where id=new.id) then raise exception 'Identificador já utilizado';end if;
  new.user_id:=auth.uid();new.project_id:=p.id;new.created_at:=now();return new;
 end if;
 select * into p from public.projects where id=old.project_id and user_id=auth.uid() for update;
 if p.id is null or p.status<>'ACTIVE' or not private.owner_enabled(auth.uid()) then raise exception 'Projeto somente leitura';end if;
 if exists(select 1 from public.phase_plans where reference_image_id=old.id) or exists(select 1 from public.diet_plans where reference_image_id=old.id) then raise exception 'Referência vinculada a uma versão';end if;
 return old;
end $$;
revoke all on function private.guard_plan_asset() from public;
create trigger guard_plan_asset before insert or delete on public.plan_assets for each row execute function private.guard_plan_asset();
create table public.plan_asset_cleanup (asset_id uuid primary key,user_id uuid not null,paths text[] not null,created_at timestamptz not null default now());
alter table public.plan_asset_cleanup enable row level security;
revoke all on public.plan_asset_cleanup from public,anon,authenticated;
grant all on public.plan_asset_cleanup to service_role;
create function private.queue_plan_asset_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.plan_asset_cleanup(asset_id,user_id,paths) values(old.id,old.user_id,array[old.storage_key]) on conflict do nothing;return null;
end $$;
revoke all on function private.queue_plan_asset_cleanup() from public;
create trigger queue_plan_asset_cleanup after delete on public.plan_assets for each row execute function private.queue_plan_asset_cleanup();
create policy diazen_plan_asset_read on storage.objects for select to authenticated using(bucket_id='body-photos' and exists(select 1 from public.plan_assets a where private.owner_enabled(a.user_id) and a.storage_key=storage.objects.name));
DO $$ declare t text;begin
 foreach t in array array['plan_assets','phase_plans'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy read_owner on public.%I for select to authenticated using(private.owner_enabled(user_id))',t);
  execute format('create policy insert_owner on public.%I for insert to authenticated with check(private.owner_enabled(user_id))',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create trigger audit_change after insert or delete on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
grant delete on public.plan_assets to authenticated;
create policy delete_owner on public.plan_assets for delete to authenticated using(private.owner_enabled(user_id));
create table public.workout_links (
 id uuid primary key,user_id uuid not null default auth.uid(),project_id uuid not null,logged_on date not null,
 activity_id uuid not null unique references public.activities(id) on delete cascade,
 request_hash text not null,
 plan_id uuid not null references public.phase_plans(id) on delete cascade,workout_id uuid not null,
 rpe numeric(3,1) check(rpe between 0 and 10),notes text check(length(notes)<=500),created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
alter table public.workout_links enable row level security;
create policy own_links on public.workout_links for select to authenticated using(private.owner_enabled(user_id));
create policy remove_links on public.workout_links for delete to authenticated using(private.owner_enabled(user_id));
revoke all on public.workout_links from public,anon,authenticated;
grant select,delete on public.workout_links to authenticated;
grant all on public.workout_links to service_role;
create trigger guard_record before insert or update or delete on public.workout_links for each row execute function private.guard_record();
create trigger audit_change after insert or delete on public.workout_links for each row execute function private.audit_change();
-- O comando autenticado recompõe o título e não permite apontar para outra conta.
create function public.record_planned_workout(p_request uuid,p_plan uuid,p_workout uuid,p_date date,p_duration numeric,p_rpe numeric default null,p_existing uuid default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.projects;v public.phase_plans;w jsonb;a public.activities;previous public.workout_links;
begin
 if not private.owner_enabled(auth.uid()) or p_request is null or p_date is null or p_duration is null or p_duration<=0 or p_duration>1440 or (p_rpe is not null and (p_rpe<0 or p_rpe>10)) or length(p_notes)>500 then raise exception 'Confira o registro';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into p from public.projects where user_id=auth.uid() and status='ACTIVE' for update;
 if p.id is null or p_date<p.starts_on or (p.ends_on is not null and p_date>p.ends_on) or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data fora da vigência';end if;
 select * into v from public.phase_plans where id=p_plan and user_id=auth.uid() and project_id=p.id and kind='strength' and effective_from<=p_date and (valid_until is null or valid_until>=p_date);
 if v.id is null then raise exception 'Plano indisponível';end if;
 select value into w from jsonb_array_elements(v.document->'workouts') where value->>'id'=p_workout::text;
 if w is null then raise exception 'Ficha indisponível';end if;
 select * into previous from public.workout_links where id=p_request;
 if found then
  if previous.user_id<>auth.uid() or previous.project_id<>p.id or previous.plan_id<>p_plan or previous.workout_id<>p_workout or previous.logged_on<>p_date or previous.request_hash<>md5(jsonb_build_array(p_plan,p_workout,p_date,p_duration,p_rpe,p_existing,p_notes)::text) or previous.rpe is distinct from p_rpe or previous.notes is distinct from p_notes then raise exception 'Solicitação já utilizada';end if;
  return previous.activity_id;
 end if;
 if p_existing is not null then
  select * into a from public.activities where id=p_existing and user_id=auth.uid() and project_id=p.id and logged_on=p_date and modality in ('strength','other') for update;
  if a.id is null then raise exception 'Atividade indisponível';end if;
 else
  insert into public.activities(id,user_id,project_id,logged_on,modality,duration_min,name) values(p_request,auth.uid(),p.id,p_date,'strength',p_duration,w->>'label') returning * into a;
 end if;
 insert into public.workout_links(id,user_id,project_id,logged_on,activity_id,plan_id,workout_id,request_hash,rpe,notes) values(p_request,auth.uid(),p.id,p_date,a.id,p_plan,p_workout,md5(jsonb_build_array(p_plan,p_workout,p_date,p_duration,p_rpe,p_existing,p_notes)::text),p_rpe,p_notes);
 return a.id;
end $$;
revoke all on function public.record_planned_workout(uuid,uuid,uuid,date,numeric,numeric,uuid,text) from public,anon;
grant execute on function public.record_planned_workout(uuid,uuid,uuid,date,numeric,numeric,uuid,text) to authenticated;
create function private.validate_phase_document() returns trigger language plpgsql security invoker set search_path='' as $$
declare d jsonb:=new.document;r jsonb;e jsonb;n numeric;lo numeric;hi numeric;
begin
 if new.kind='hydration' then
  if jsonb_typeof(d->'min_ml')<>'number' or jsonb_typeof(d->'max_ml')<>'number' then raise exception 'Volumes inválidos';end if;
  lo:=(d->>'min_ml')::numeric;hi:=(d->>'max_ml')::numeric;
  if lo is null or hi is null or lo<100 or hi<lo or hi>15000 or lo<>trunc(lo) or hi<>trunc(hi) then raise exception 'Volumes inválidos';end if;
  if jsonb_typeof(d->'schedule') is distinct from 'array' or jsonb_array_length(d->'schedule')>12 or jsonb_typeof(d->'alternatives') is distinct from 'array' or jsonb_array_length(d->'alternatives')>8 then raise exception 'Distribuição inválida';end if;
  for r in select value from jsonb_array_elements((d->'schedule')||(d->'alternatives')) loop
   lo:=(r->>'min_ml')::numeric;hi:=(r->>'max_ml')::numeric;
   if jsonb_typeof(r->'label') is distinct from 'string' or length(trim(r->>'label')) not between 1 and 80 or lo is null or hi is null or lo<100 or hi<lo or hi>15000 or lo<>trunc(lo) or hi<>trunc(hi) then raise exception 'Referência inválida';end if;
   if r ? 'time' and (r->>'time')<>'' and (r->>'time')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horário inválido';end if;
  end loop;
 else
  if jsonb_typeof(d->'workouts') is distinct from 'array' or jsonb_array_length(d->'workouts') not between 1 and 10 then raise exception 'Fichas inválidas';end if;
  for r in select value from jsonb_array_elements(d->'workouts') loop
   if (r->>'id') is null or (r->>'id')!~'^[0-9a-f-]{36}$' or jsonb_typeof(r->'label') is distinct from 'string' or length(trim(r->>'label')) not between 1 and 80 or jsonb_typeof(r->'weekdays') is distinct from 'array' or jsonb_array_length(r->'weekdays')>7 or jsonb_typeof(r->'exercises') is distinct from 'array' or jsonb_array_length(r->'exercises') not between 1 and 30 then raise exception 'Ficha inválida';end if;
   for e in select value from jsonb_array_elements(r->'weekdays') loop
    n:=(e#>>'{}')::numeric;if n is null or n<0 or n>6 or n<>trunc(n) then raise exception 'Dia inválido';end if;
   end loop;
   for e in select value from jsonb_array_elements(r->'exercises') loop
    n:=(e->>'sets')::numeric;lo:=(e->>'reps_min')::numeric;hi:=(e->>'reps_max')::numeric;
    if (e->>'id') is null or (e->>'id')!~'^[0-9a-f-]{36}$' or jsonb_typeof(e->'name') is distinct from 'string' or length(trim(e->>'name')) not between 1 and 120 or n is null or n<1 or n>20 or n<>trunc(n) or lo is null or hi is null or lo<1 or hi<lo or hi>100 or lo<>trunc(lo) or hi<>trunc(hi) then raise exception 'Exercício inválido';end if;
    if (e->>'rest_seconds') is not null and ((e->>'rest_seconds')::numeric<0 or (e->>'rest_seconds')::numeric>900 or (e->>'rest_seconds')::numeric<>trunc((e->>'rest_seconds')::numeric)) then raise exception 'Descanso inválido';end if;
   end loop;
  end loop;
 end if;
 if (d->>'notes') is not null and length(d->>'notes')>1000 then raise exception 'Observação extensa';end if;
 return new;
end $$;
revoke all on function private.validate_phase_document() from public;
create trigger validate_phase_document before insert on public.phase_plans for each row execute function private.validate_phase_document();
create or replace function private.guard_meal_origin() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.plan_id is distinct from old.plan_id or new.plan_meal_index is distinct from old.plan_meal_index or new.plan_food_index is distinct from old.plan_food_index) then raise exception 'Origem imutável';end if;
 if new.plan_id is not null then
  if not exists(select 1 from public.diet_plans p where p.id=new.plan_id and p.user_id=auth.uid() and p.project_id=new.project_id and jsonb_array_length(p.document->'meals')>new.plan_meal_index) then raise exception 'Plano indisponível';end if;
  if (tg_op='INSERT' or new.logged_on is distinct from old.logged_on) and exists(select 1 from public.diet_plans p where p.id=new.plan_id and (p.effective_from>new.logged_on or p.valid_until<new.logged_on)) then raise exception 'Plano fora da vigência';end if;
 end if;return new;
end $$;
create function private.guard_photo_plan_collision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.plan_assets where id=new.id) then raise exception 'Identificador já utilizado';end if;return new;
end $$;
revoke all on function private.guard_photo_plan_collision() from public;
create trigger zz_photo_plan_collision before insert on public.photos for each row execute function private.guard_photo_plan_collision();
commit;
