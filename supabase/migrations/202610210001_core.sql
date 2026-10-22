-- Diazen MVP 0.1: RF-002..RF-021, RB-01..RB-10, RNF-002/RNF-004.
-- Aplicar em Supabase após revisar docs/modelagem.md. Sem dados ou segredos.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.account_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletions enable row level security;
-- Sem policies: somente funções específicas e operações administrativas.
create function private.owner_enabled(owner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner_id = auth.uid() and not exists(select 1 from public.account_deletions where user_id = auth.uid());
$$;
revoke all on function private.owner_enabled(uuid) from public;
grant execute on function private.owner_enabled(uuid) to authenticated;
create function public.account_available() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.owner_enabled(auth.uid()); $$;
revoke all on function public.account_available() from public;
grant execute on function public.account_available() to authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  starts_on date not null,
  ends_on date,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','COMPLETED','ARCHIVED')),
  weight_mode text not null default 'none' check (weight_mode in ('none','target','range','track')),
  weight_min numeric(6,2), weight_max numeric(6,2),
  sessions_goal integer check (sessions_goal between 1 and 50),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id,user_id),
  check (ends_on is null or ends_on >= starts_on),
  check ((weight_mode in ('none','track') and weight_min is null and weight_max is null)
    or (weight_mode = 'target' and weight_min is not null and weight_min between 20 and 500 and weight_max is null)
    or (weight_mode = 'range' and weight_min is not null and weight_max is not null and weight_min between 20 and 500 and weight_max between weight_min and 500))
);
create unique index one_active_per_user on public.projects(user_id) where status = 'ACTIVE';
create index projects_owner on public.projects(user_id,created_at desc);

create table public.water_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(), project_id uuid not null,
  effective_from date not null, target_ml integer not null check (target_ml between 100 and 15000),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  unique(project_id,effective_from)
);
create index water_goals_owner on public.water_goals(user_id,project_id,effective_from desc);

create table public.water_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, logged_time time, volume_ml integer not null check(volume_ml between 1 and 5000),
  container_label text check(length(container_label) <= 60), created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
create table public.weights (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, kg numeric(6,2) not null check(kg between 20 and 500), created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  unique(user_id,logged_on)
);
create table public.measurements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, measurement_type text not null check(measurement_type in ('waist','abdomen','hips','chest','left_arm','right_arm','left_thigh','right_thigh','left_calf','right_calf')),
  value_cm numeric(6,2) not null check(value_cm between 1 and 300), created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  unique(user_id,logged_on,measurement_type)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, modality text not null check(modality in ('strength','running','cycling','swimming')),
  duration_min numeric(7,2) not null check(duration_min > 0 and duration_min <= 1440),
  distance_km numeric(8,3) check(distance_km > 0 and distance_km <= 1000),
  notes text check(length(notes) <= 1000), created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  check(modality = 'strength' or distance_km is not null)
);
create table public.meal_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, category text not null check(category in ('breakfast','morning_snack','lunch','afternoon_snack','dinner','supper')),
  name text not null check(length(trim(name)) between 1 and 120),
  amount numeric(10,3) not null check(amount > 0 and amount <= 100000),
  unit text not null check(unit in ('g','ml','unit','portion')),
  reference_amount numeric(10,3) not null check(reference_amount > 0 and reference_amount <= 100000),
  source text not null check(length(trim(source)) between 1 and 200),
  kcal numeric(10,3) check(kcal between 0 and 100000),
  protein numeric(10,3) check(protein between 0 and 100000),
  carbs numeric(10,3) check(carbs between 0 and 100000),
  fat numeric(10,3) check(fat between 0 and 100000),
  created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
create table public.meal_days (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, confirmed boolean not null default false,
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  unique(project_id,logged_on)
);
create table public.photos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
  logged_on date not null, category text not null check(category in ('front','back','side','other')),
  storage_key text not null unique, thumbnail_key text not null unique,
  created_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
  check(storage_key = user_id::text || '/' || project_id::text || '/' || id::text || '.webp'),
  check(thumbnail_key = user_id::text || '/' || project_id::text || '/' || id::text || '-thumb.webp')
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid, entity text not null, entity_id uuid not null, action text not null,
  occurred_at timestamptz not null default now(),
  -- Snapshot apenas para substituição de peso; nunca copiar fotos ou credenciais.
  previous_kg numeric(6,2)
);
create index audit_owner on public.audit_events(user_id,occurred_at desc);
alter table public.audit_events enable row level security;
-- Auditoria sem acesso via API do usuário.

create function private.guard_project() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível'; end if;
  -- Serializa transições do mesmo usuário, além do índice único parcial.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if TG_OP = 'INSERT' then
    new.user_id := auth.uid(); new.status := 'DRAFT'; new.closed_at := null; new.created_at := now();
  else
    if old.status in ('COMPLETED','ARCHIVED') then raise exception 'Projeto somente leitura'; end if;
    if new.id <> old.id or new.user_id <> old.user_id or new.created_at <> old.created_at then raise exception 'Identidade imutável'; end if;
    if old.status = 'ACTIVE' and (new.starts_on <> old.starts_on or new.ends_on is distinct from old.ends_on) then raise exception 'Datas imutáveis após ativação'; end if;
    if old.status = 'ACTIVE' and new.status = 'DRAFT' then raise exception 'Transição inválida'; end if;
    if old.status = 'DRAFT' and new.status = 'COMPLETED' then raise exception 'Transição inválida'; end if;
    if new.status = 'ACTIVE' then
      if new.starts_on > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Início futuro'; end if;
      if new.weight_mode not in ('target','range') and new.sessions_goal is null and not exists(select 1 from public.water_goals where project_id = new.id) then raise exception 'Configure uma meta mensurável'; end if;
    end if;
    new.closed_at := case when new.status in ('COMPLETED','ARCHIVED') then now() else null end;
  end if;
  return new;
end $$;
create trigger guard_project before insert or update on public.projects for each row execute function private.guard_project();

create function private.guard_record() returns trigger language plpgsql security invoker set search_path = '' as $$
declare p public.projects; d date;
begin
  if TG_OP = 'DELETE' and current_user in ('postgres','service_role','supabase_auth_admin') then return old; end if;
  if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível'; end if;
  if TG_OP = 'INSERT' then
    -- Ignorar projeto fornecido: resolver ACTIVE dentro da transação.
    select * into p from public.projects where user_id = auth.uid() and status = 'ACTIVE' for update;
    if p.id is null then raise exception 'Nenhum projeto ativo'; end if;
    new.user_id := auth.uid(); new.project_id := p.id;
  else
    select * into p from public.projects where id = old.project_id and user_id = auth.uid() for update;
    if p.id is null or p.status <> 'ACTIVE' then raise exception 'Projeto somente leitura'; end if;
    if TG_OP = 'UPDATE' and (new.id <> old.id or new.user_id <> old.user_id or new.project_id <> old.project_id) then raise exception 'Identidade imutável'; end if;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  if TG_OP = 'INSERT' and TG_TABLE_NAME <> 'meal_days' then new.created_at := now(); end if;
  if TG_OP = 'UPDATE' and TG_TABLE_NAME <> 'meal_days' then new.created_at := old.created_at; end if;
  d := new.logged_on;
  if d < p.starts_on or (p.ends_on is not null and d > p.ends_on) or d > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data fora da vigência do projeto ativo'; end if;
  return new;
end $$;

create function private.guard_water_goal() returns trigger language plpgsql security invoker set search_path = '' as $$
declare p public.projects;
begin
  select * into p from public.projects where id = new.project_id and user_id = auth.uid() for update;
  if p.id is null or p.status not in ('DRAFT','ACTIVE') or not private.owner_enabled(auth.uid()) then raise exception 'Projeto indisponível'; end if;
  if TG_OP = 'UPDATE' then
    if new.id <> old.id or new.project_id <> old.project_id or new.user_id <> old.user_id or new.effective_from <> old.effective_from then raise exception 'Versão imutável'; end if;
    if old.effective_from < (now() at time zone 'America/Sao_Paulo')::date and p.status <> 'DRAFT' then raise exception 'Meta histórica imutável'; end if;
  end if;
  if new.effective_from < p.starts_on or (p.ends_on is not null and new.effective_from > p.ends_on) then raise exception 'Vigência inválida'; end if;
  if p.status = 'ACTIVE' and new.effective_from < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Meta não pode alterar o passado'; end if;
  new.user_id := auth.uid();
  return new;
end $$;
create trigger guard_water_goal before insert or update on public.water_goals for each row execute function private.guard_water_goal();

create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if not exists(select 1 from auth.users where id = (r->>'user_id')::uuid) then return null; end if;
  insert into public.audit_events(user_id,project_id,entity,entity_id,action,previous_kg)
    values ((r->>'user_id')::uuid, case when TG_TABLE_NAME = 'projects' then (r->>'id')::uuid else (r->>'project_id')::uuid end,
    TG_TABLE_NAME,(r->>'id')::uuid,TG_OP,case when TG_TABLE_NAME = 'weights' and TG_OP = 'UPDATE' then (to_jsonb(old)->>'kg')::numeric else null end);
  return null;
end $$;

DO $$ declare t text; begin
  foreach t in array array['projects','water_goals','water_entries','weights','measurements','activities','meal_items','meal_days','photos'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy read_owner on public.%I for select to authenticated using (private.owner_enabled(user_id))',t);
    execute format('create policy insert_owner on public.%I for insert to authenticated with check (private.owner_enabled(user_id))',t);
    execute format('create policy update_owner on public.%I for update to authenticated using (private.owner_enabled(user_id)) with check (private.owner_enabled(user_id))',t);
    if t not in ('projects','water_goals') then
      execute format('create policy delete_owner on public.%I for delete to authenticated using (private.owner_enabled(user_id))',t);
      execute format('create trigger guard_record before insert or update or delete on public.%I for each row execute function private.guard_record()',t);
    end if;
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('revoke all on public.%I from anon',t);
    if t not in ('projects','water_goals') then execute format('create index %I on public.%I(user_id,project_id,logged_on desc)',t || '_owner_date',t); end if;
  end loop;
end $$;

create function private.unconfirm_meal_day() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('postgres','service_role','supabase_auth_admin') then return null; end if;
  if TG_OP <> 'INSERT' then update public.meal_days set confirmed = false where project_id = old.project_id and logged_on = old.logged_on and confirmed; end if;
  if TG_OP <> 'DELETE' then update public.meal_days set confirmed = false where project_id = new.project_id and logged_on = new.logged_on and confirmed; end if;
  return null;
end $$;
create trigger unconfirm_meal_day after insert or update or delete on public.meal_items for each row execute function private.unconfirm_meal_day();

-- Criação atômica: não deixar onboarding com ACTIVE sem meta ou meta sem projeto.
create function public.create_project(p_name text,p_starts_on date,p_ends_on date default null,p_water_ml integer default null,p_weight_mode text default 'none',p_weight_min numeric default null,p_weight_max numeric default null,p_sessions integer default null,p_activate boolean default true) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  insert into public.projects(name,starts_on,ends_on,weight_mode,weight_min,weight_max,sessions_goal)
    values(p_name,p_starts_on,p_ends_on,p_weight_mode,p_weight_min,p_weight_max,p_sessions) returning id into result;
  if p_water_ml is not null then insert into public.water_goals(project_id,effective_from,target_ml) values(result,p_starts_on,p_water_ml); end if;
  if p_activate then update public.projects set status = 'ACTIVE' where id = result; end if;
  return result;
end $$;
revoke all on function public.create_project(text,date,date,integer,text,numeric,numeric,integer,boolean) from public;
grant execute on function public.create_project(text,date,date,integer,text,numeric,numeric,integer,boolean) to authenticated;

create function public.request_account_deletion() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  insert into public.account_deletions(user_id) values(auth.uid()) on conflict do nothing;
end $$;
revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

-- Grants de funções de trigger apenas ao mecanismo, nunca como RPC pública.
revoke all on all functions in schema private from public;
grant execute on function private.owner_enabled(uuid) to authenticated;
commit;
