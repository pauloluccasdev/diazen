-- Registro explícito e atômico de refeições, sem transformar importação em consumo.
begin;
alter table public.meal_items add column plan_id uuid references public.diet_plans(id) on delete cascade;
alter table public.meal_items add column plan_meal_index integer check(plan_meal_index between 0 and 29);
alter table public.meal_items add column plan_food_index integer check(plan_food_index between 0 and 99);
alter table public.meal_items add constraint meal_plan_origin check((plan_id is null and plan_meal_index is null and plan_food_index is null) or (plan_id is not null and plan_meal_index is not null and plan_food_index is not null));
create unique index meal_items_plan_food_unique on public.meal_items(user_id,project_id,logged_on,plan_id,plan_meal_index,plan_food_index) where plan_id is not null;
create function private.guard_meal_origin() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.plan_id is distinct from old.plan_id or new.plan_meal_index is distinct from old.plan_meal_index or new.plan_food_index is distinct from old.plan_food_index) then raise exception 'Origem imutável';end if;
  if new.plan_id is not null and not exists(select 1 from public.diet_plans p where p.id=new.plan_id and p.user_id=auth.uid() and p.project_id=new.project_id and jsonb_array_length(p.document->'meals')>new.plan_meal_index) then raise exception 'Plano indisponível';end if;
  return new;
end $$;
revoke all on function private.guard_meal_origin() from public;
create trigger zz_guard_meal_origin before insert or update on public.meal_items for each row execute function private.guard_meal_origin();
create function public.register_meal(p_request uuid,p_date date,p_category text,p_items jsonb,p_plan uuid default null,p_meal integer default null) returns integer
language plpgsql security invoker set search_path='' as $$
declare previous public.food_copy_requests; parameters jsonb; item jsonb; active_id uuid; inserted integer:=0; existing_count integer;
begin
  if not private.owner_enabled(auth.uid()) or p_request is null or (p_plan is null)<>(p_meal is null) or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 or octet_length(p_items::text)>100000 then raise exception 'Refeição inválida';end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select id into active_id from public.projects where user_id=auth.uid() and status='ACTIVE' for update;
  if active_id is null then raise exception 'Nenhum projeto ativo';end if;
  parameters:=jsonb_build_array('register_meal',active_id,p_date,p_category,p_plan,p_meal,md5(p_items::text));
  select * into previous from public.food_copy_requests where id=p_request;
  if found then
    if previous.parameters<>parameters then raise exception 'Solicitação já utilizada';end if;
    return previous.inserted_count;
  end if;
  if p_plan is not null then
    if not exists(select 1 from public.diet_plans where id=p_plan and user_id=auth.uid() and project_id=active_id and p_meal>=0 and p_meal<jsonb_array_length(document->'meals') and (document->'meals'->p_meal->>'enabled')::boolean) then raise exception 'Plano indisponível';end if;
    select count(*) into existing_count from public.meal_items where user_id=auth.uid() and project_id=active_id and logged_on=p_date and plan_id=p_plan and plan_meal_index=p_meal;
    if existing_count>0 then raise exception 'Refeição já registrada nesta data';end if;
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    insert into public.meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal,protein,carbs,fat,plan_id,plan_meal_index,plan_food_index)
      values(p_date,p_category,item->>'name',(item->>'amount')::numeric,item->>'unit',(item->>'reference_amount')::numeric,item->>'source',(item->>'kcal')::numeric,(item->>'protein')::numeric,(item->>'carbs')::numeric,(item->>'fat')::numeric,p_plan,p_meal,case when p_plan is null then null else inserted end);
    inserted:=inserted+1;
  end loop;
  insert into public.food_copy_requests(id,parameters,inserted_count) values(p_request,parameters,inserted);
  return inserted;
end $$;
revoke all on function public.register_meal(uuid,date,text,jsonb,uuid,integer) from public,anon;
grant execute on function public.register_meal(uuid,date,text,jsonb,uuid,integer) to authenticated;
commit;
