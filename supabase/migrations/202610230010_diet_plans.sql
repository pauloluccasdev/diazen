-- Extensão de escopo autorizada: plano alimentar fornecido pelo usuário, sem prescrição.
begin;
create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120),
  document jsonb not null check((jsonb_typeof(document)='object' and document->>'version'='1' and jsonb_typeof(document->'meals')='array' and jsonb_array_length(document->'meals') between 1 and 30 and octet_length(document::text)<=600000) is true),
  created_at timestamptz not null default now()
);
alter table public.diet_plans enable row level security;
create policy read_owner on public.diet_plans for select to authenticated using(private.owner_enabled(user_id));
create policy insert_owner on public.diet_plans for insert to authenticated with check(private.owner_enabled(user_id) and exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid() and p.status in ('DRAFT','ACTIVE')));
revoke all on public.diet_plans from public,anon,authenticated;
grant select,insert on public.diet_plans to authenticated;
grant all on public.diet_plans to service_role;
create index diet_plans_project on public.diet_plans(user_id,project_id,created_at desc,id);
create function private.guard_diet_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.projects;
begin
  select * into p from public.projects where id=new.project_id for update;
  if p.id is null or p.user_id<>auth.uid() or p.status not in ('DRAFT','ACTIVE') or not private.owner_enabled(auth.uid()) then raise exception 'Projeto indisponível';end if;
  new.user_id:=auth.uid();new.created_at:=now();return new;
end $$;
revoke all on function private.guard_diet_plan() from public;
create trigger guard_diet_plan before insert on public.diet_plans for each row execute function private.guard_diet_plan();
create trigger audit_change after insert on public.diet_plans for each row execute function private.audit_change();
commit;
