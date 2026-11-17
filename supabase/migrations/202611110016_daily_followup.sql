-- RD-01..05: acompanhamento diário opcional; sem preenchimento pessoal automático.
begin;
create table public.display_preferences (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 show_weight boolean not null default true,
 show_calories boolean not null default true,
 show_photos boolean not null default true
);
create table public.project_phases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), project_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 100),
 starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 objective text not null check(length(trim(objective)) between 1 and 500),
 milestone text check(length(milestone) between 1 and 120), milestone_on date,
 created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
 check ((milestone is null) = (milestone_on is null)),
 check(milestone_on is null or milestone_on between starts_on and ends_on)
);
create index project_phases_dates on public.project_phases(user_id,project_id,starts_on);
create function private.guard_phase() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.projects;
begin
 if TG_OP='DELETE' and current_user in ('postgres','service_role','supabase_auth_admin') then return old;end if;
 if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível';end if;
 if TG_OP='INSERT' then
  select * into p from public.projects where user_id=auth.uid() and status='ACTIVE' for update;
  if p.id is null then raise exception 'Nenhum projeto ativo';end if;
  new.user_id:=auth.uid();new.project_id:=p.id;new.created_at:=now();
 else
  select * into p from public.projects where id=old.project_id and user_id=auth.uid() for update;
  if p.id is null or p.status<>'ACTIVE' then raise exception 'Projeto somente leitura';end if;
  if TG_OP='DELETE' then return old;end if;
  if new.id<>old.id or new.project_id<>old.project_id or new.user_id<>old.user_id then raise exception 'Identidade imutável';end if;
  new.created_at:=old.created_at;
 end if;
 if new.starts_on<p.starts_on or (p.ends_on is not null and new.ends_on>p.ends_on) then raise exception 'Fase fora da vigência';end if;
 if exists(select 1 from public.project_phases f where f.project_id=p.id and f.id<>new.id and daterange(f.starts_on,f.ends_on,'[]') && daterange(new.starts_on,new.ends_on,'[]')) then raise exception 'Fases não podem se sobrepor';end if;
 return new;
end $$;
revoke all on function private.guard_phase() from public;
create trigger guard_phase before insert or update or delete on public.project_phases for each row execute function private.guard_phase();
create table public.daily_checkins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),project_id uuid not null,logged_on date not null,
 sleep_hours numeric(4,2) check(sleep_hours between 0 and 24),
 sleep_quality integer check(sleep_quality between 0 and 4),fatigue integer check(fatigue between 0 and 4),soreness integer check(soreness between 0 and 4),energy integer check(energy between 0 and 4),
 worked text check(length(worked)<=500),difficulty text check(length(difficulty)<=500),tomorrow text check(length(tomorrow)<=500),
 created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade,
 unique(user_id,logged_on),
 check(num_nonnulls(sleep_hours,sleep_quality,fatigue,soreness,energy,worked,difficulty,tomorrow)>0)
);
create table public.eating_context_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),project_id uuid not null,logged_on date not null,
 context text not null check(context in ('routine','social','loss_of_control')),
 category text check(category in ('breakfast','morning_snack','lunch','afternoon_snack','dinner','supper')),
 hunger integer check(hunger between 0 and 10),satiety integer check(satiety between 0 and 10),
 triggers text check(length(triggers)<=300),notes text check(length(notes)<=500),created_at timestamptz not null default now(),
 foreign key(project_id,user_id) references public.projects(id,user_id) on delete cascade
);
DO $$ declare t text;begin
 foreach t in array array['display_preferences','project_phases','daily_checkins','eating_context_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy own_data on public.%I to authenticated using(private.owner_enabled(user_id)) with check(private.owner_enabled(user_id))',t);
  if t<>'display_preferences' then
   execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
  end if;
  if t in ('daily_checkins','eating_context_events') then
   execute format('create trigger guard_record before insert or update or delete on public.%I for each row execute function private.guard_record()',t);
   execute format('create index %I on public.%I(user_id,project_id,logged_on desc)',t || '_date',t);
  end if;
 end loop;
end $$;
create function public.save_daily_checkin(p_date date,p_values jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare p uuid;r uuid;
begin
 if jsonb_typeof(p_values)<>'object' or exists(select 1 from jsonb_object_keys(p_values) k where k not in ('sleep_hours','sleep_quality','fatigue','soreness','energy','worked','difficulty','tomorrow')) then raise exception 'Campos inválidos';end if;
 select id into p from public.projects where user_id=auth.uid() and status='ACTIVE' for update;
 if p is null then raise exception 'Nenhum projeto ativo';end if;
 insert into public.daily_checkins(project_id,logged_on,sleep_hours,sleep_quality,fatigue,soreness,energy,worked,difficulty,tomorrow)
 values(p,p_date,(p_values->>'sleep_hours')::numeric,(p_values->>'sleep_quality')::integer,(p_values->>'fatigue')::integer,(p_values->>'soreness')::integer,(p_values->>'energy')::integer,nullif(trim(p_values->>'worked'),''),nullif(trim(p_values->>'difficulty'),''),nullif(trim(p_values->>'tomorrow'),''))
 on conflict(user_id,logged_on) do update set sleep_hours=excluded.sleep_hours,sleep_quality=excluded.sleep_quality,fatigue=excluded.fatigue,soreness=excluded.soreness,energy=excluded.energy,worked=excluded.worked,difficulty=excluded.difficulty,tomorrow=excluded.tomorrow returning id into r;
 return r;
end $$;
revoke all on function public.save_daily_checkin(date,jsonb) from public,anon;
grant execute on function public.save_daily_checkin(date,jsonb) to authenticated;
commit;
