-- RF-009 aprovado pelo proprietário em 22/10/2026. Biblioteca privada da conta.
begin;
create table public.food_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'food' check(kind in ('food','recipe')),
  name text not null check(length(trim(name)) between 1 and 120),
  unit text not null check(unit in ('g','ml','unit','portion')),
  reference_amount numeric(10,3) not null check(reference_amount > 0 and reference_amount <= 100000),
  source text not null check(length(trim(source)) between 1 and 200),
  kcal numeric(10,3) check(kcal between 0 and 100000),
  protein numeric(10,3) check(protein between 0 and 100000),
  carbs numeric(10,3) check(carbs between 0 and 100000),
  fat numeric(10,3) check(fat between 0 and 100000),
  favorite boolean not null default false,
  -- Snapshots dos ingredientes, calculados no banco; não dependem da edição/exclusão do alimento.
  ingredients jsonb,
  created_at timestamptz not null default now(),
  check((kind='food' and ingredients is null) or (kind='recipe' and jsonb_typeof(ingredients)='array' and jsonb_array_length(ingredients)>0))
);
alter table public.food_library enable row level security;
create policy read_owner on public.food_library for select to authenticated using(private.owner_enabled(user_id));
create policy insert_owner on public.food_library for insert to authenticated with check(private.owner_enabled(user_id));
create policy update_owner on public.food_library for update to authenticated using(private.owner_enabled(user_id)) with check(private.owner_enabled(user_id));
create policy delete_owner on public.food_library for delete to authenticated using(private.owner_enabled(user_id));
revoke all on public.food_library from public,anon,authenticated;
grant select,insert,update,delete on public.food_library to authenticated;
grant all on public.food_library to service_role;
create index food_library_owner on public.food_library(user_id,favorite desc,created_at desc,id);
create function private.guard_library() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if TG_OP='DELETE' and current_user in ('postgres','service_role','supabase_auth_admin') then return old; end if;
  if not private.owner_enabled(auth.uid()) then raise exception 'Conta indisponível'; end if;
  if TG_OP='INSERT' then new.user_id:=auth.uid();new.created_at:=now();
  elsif TG_OP='UPDATE' then
    if new.id<>old.id or new.user_id<>old.user_id or new.kind<>old.kind or new.created_at<>old.created_at then raise exception 'Identidade imutável';end if;
  end if;
  if TG_OP='DELETE' then return old;end if;
  return new;
end $$;
revoke all on function private.guard_library() from public;
create trigger guard_library before insert or update or delete on public.food_library for each row execute function private.guard_library();
create trigger audit_change after insert or update or delete on public.food_library for each row execute function private.audit_change();

-- Receitas são compiladas de alimentos próprios, nunca de valores nutricionais inventados.
create function public.save_recipe(p_id uuid,p_name text,p_portions numeric,p_ingredients jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare item jsonb; food public.food_library; snapshots jsonb:='[]'; n integer:=0;
  calories numeric:=0; proteins numeric:=0; carbohydrates numeric:=0; fats numeric:=0; amount numeric;
begin
  if not private.owner_enabled(auth.uid()) or p_id is null or p_portions is null or p_portions<=0 or p_portions>100000 then raise exception 'Receita inválida';end if;
  if jsonb_typeof(p_ingredients) is distinct from 'array' or jsonb_array_length(p_ingredients) not between 1 and 100 then raise exception 'Informe entre 1 e 100 ingredientes';end if;
  for item in select * from jsonb_array_elements(p_ingredients) loop
    select * into food from public.food_library where id=(item->>'food_id')::uuid and kind='food';
    if food.id is null then raise exception 'Ingrediente indisponível';end if;
    amount:=(item->>'amount')::numeric;
    if amount is null or amount<=0 or amount>100000 then raise exception 'Quantidade inválida';end if;
    snapshots:=snapshots||jsonb_build_array(jsonb_build_object('food_id',food.id,'name',food.name,'amount',amount,'unit',food.unit,'reference_amount',food.reference_amount,'source',food.source,'kcal',food.kcal,'protein',food.protein,'carbs',food.carbs,'fat',food.fat));
    calories:=calories+food.kcal*amount/food.reference_amount;
    proteins:=proteins+food.protein*amount/food.reference_amount;
    carbohydrates:=carbohydrates+food.carbs*amount/food.reference_amount;
    fats:=fats+food.fat*amount/food.reference_amount;
    n:=n+1;
  end loop;
  insert into public.food_library(id,kind,name,unit,reference_amount,source,kcal,protein,carbs,fat,ingredients)
    values(p_id,'recipe',p_name,'portion',p_portions,'Receita própria: composição dos ingredientes',calories,proteins,carbohydrates,fats,snapshots);
  return p_id;
end $$;
revoke all on function public.save_recipe(uuid,text,numeric,jsonb) from public,anon;
grant execute on function public.save_recipe(uuid,text,numeric,jsonb) to authenticated;

-- Um dos dois identificadores define a origem; o destino é sempre o ACTIVE resolvido pelo trigger.
create function public.add_library_food(p_saved uuid,p_recent uuid,p_date date,p_category text,p_amount numeric,p_request uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare item record; inserted integer;
begin
  if (p_saved is null)=(p_recent is null) or p_request is null then raise exception 'Origem inválida';end if;
  if p_saved is not null then
    select name,unit,reference_amount,source,kcal,protein,carbs,fat into item from public.food_library where id=p_saved;
  else
    select name,unit,reference_amount,source,kcal,protein,carbs,fat into item from public.meal_items where id=p_recent;
  end if;
  if not found then raise exception 'Alimento indisponível';end if;
  insert into public.meal_items(id,logged_on,category,name,amount,unit,reference_amount,source,kcal,protein,carbs,fat)
    values(p_request,p_date,p_category,item.name,p_amount,item.unit,item.reference_amount,item.source,item.kcal,item.protein,item.carbs,item.fat)
    on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  return inserted;
end $$;
revoke all on function public.add_library_food(uuid,uuid,date,text,numeric,uuid) from public,anon;
grant execute on function public.add_library_food(uuid,uuid,date,text,numeric,uuid) to authenticated;

-- Ledger idempotente da cópia: inclusive origem=destino e resposta perdida após COMMIT.
create table public.food_copy_requests (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parameters jsonb not null, inserted_count integer not null check(inserted_count>=0), created_at timestamptz not null default now()
);
alter table public.food_copy_requests enable row level security;
create policy read_owner on public.food_copy_requests for select to authenticated using(private.owner_enabled(user_id));
create policy insert_owner on public.food_copy_requests for insert to authenticated with check(private.owner_enabled(user_id));
revoke all on public.food_copy_requests from public,anon,authenticated;
grant select,insert on public.food_copy_requests to authenticated;
grant all on public.food_copy_requests to service_role;
create trigger guard_library before insert on public.food_copy_requests for each row execute function private.guard_library();

create function public.copy_meal(p_source_project uuid,p_source_date date,p_source_category text,p_target_date date,p_target_category text,p_request uuid,p_confirm boolean) returns integer
language plpgsql security invoker set search_path='' as $$
declare inserted integer; previous public.food_copy_requests; parameters jsonb;
begin
  if p_confirm is distinct from true or p_request is null then raise exception 'Confirme a cópia';end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  parameters:=jsonb_build_array(p_source_project,p_source_date,p_source_category,p_target_date,p_target_category);
  select * into previous from public.food_copy_requests where id=p_request;
  if found then
    if previous.parameters<>parameters then raise exception 'Solicitação já utilizada';end if;
    return previous.inserted_count;
  end if;
  -- Materialização evita que uma cópia para a própria refeição releia os itens novos.
  with originals as materialized (
    select * from public.meal_items where project_id=p_source_project and logged_on=p_source_date and category=p_source_category
  )
  insert into public.meal_items(id,logged_on,category,name,amount,unit,reference_amount,source,kcal,protein,carbs,fat)
    select md5(auth.uid()::text||p_request::text||id::text)::uuid,p_target_date,p_target_category,name,amount,unit,reference_amount,source,kcal,protein,carbs,fat from originals
    on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 and not exists(select 1 from public.meal_items where project_id=p_source_project and logged_on=p_source_date and category=p_source_category) then raise exception 'Refeição de origem sem registros';end if;
  insert into public.food_copy_requests(id,parameters,inserted_count) values(p_request,parameters,inserted);
  return inserted;
end $$;
revoke all on function public.copy_meal(uuid,date,text,date,text,uuid,boolean) from public,anon;
grant execute on function public.copy_meal(uuid,date,text,date,text,uuid,boolean) to authenticated;
commit;
