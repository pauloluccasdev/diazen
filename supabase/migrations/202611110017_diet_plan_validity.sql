-- Vigência explícita sem reescrever documentos ou consumo histórico.
begin;
alter table public.diet_plans add column effective_from date;
update public.diet_plans set effective_from=(created_at at time zone 'America/Sao_Paulo')::date;
alter table public.diet_plans alter column effective_from set not null;
alter table public.diet_plans alter column effective_from set default (now() at time zone 'America/Sao_Paulo')::date;
create index diet_plans_validity on public.diet_plans(user_id,project_id,effective_from desc,created_at desc);
create or replace function private.guard_diet_plan() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.projects;
begin
 select * into p from public.projects where id=new.project_id for update;
 if p.id is null or p.user_id<>auth.uid() or p.status not in ('DRAFT','ACTIVE') or not private.owner_enabled(auth.uid()) then raise exception 'Projeto indisponível';end if;
 if new.effective_from<p.starts_on or (p.ends_on is not null and new.effective_from>p.ends_on) then raise exception 'Plano fora da vigência';end if;
 new.user_id:=auth.uid();new.created_at:=now();return new;
end $$;
create or replace function private.guard_meal_origin() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.plan_id is distinct from old.plan_id or new.plan_meal_index is distinct from old.plan_meal_index or new.plan_food_index is distinct from old.plan_food_index) then raise exception 'Origem imutável';end if;
 if new.plan_id is not null then
  if not exists(select 1 from public.diet_plans p where p.id=new.plan_id and p.user_id=auth.uid() and p.project_id=new.project_id and jsonb_array_length(p.document->'meals')>new.plan_meal_index) then raise exception 'Plano indisponível';end if;
  if (tg_op='INSERT' or new.logged_on is distinct from old.logged_on) and exists(select 1 from public.diet_plans p where p.id=new.plan_id and p.effective_from>new.logged_on) then raise exception 'Plano ainda não vigente';end if;
 end if;
 return new;
end $$;
commit;
