begin;
-- Agregações no banco: totais não podem depender da página visível da listagem.
create function public.project_summary(p_project uuid,p_date date) returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'water_ml',(select sum(volume_ml) from public.water_entries where project_id=p_project and logged_on=p_date),
  'water_count',(select count(*) from public.water_entries where project_id=p_project and logged_on=p_date),
  'water_goal',(select target_ml from public.water_goals where project_id=p_project and effective_from<=p_date order by effective_from desc limit 1),
  'weight',(select kg from public.weights where project_id=p_project and logged_on<=p_date order by logged_on desc limit 1),
  'weight_date',(select logged_on from public.weights where project_id=p_project and logged_on<=p_date order by logged_on desc limit 1),
  'sessions',(select nullif(count(*),0) from public.activities where project_id=p_project and logged_on between date_trunc('week',p_date::timestamp)::date and date_trunc('week',p_date::timestamp)::date+6),
  'food_count',(select count(*) from public.meal_items where project_id=p_project and logged_on=p_date),
  'confirmed',coalesce((select confirmed from public.meal_days where project_id=p_project and logged_on=p_date),false),
  'kcal',(select sum(kcal*amount/reference_amount) from public.meal_items where project_id=p_project and logged_on=p_date),
  'protein',(select sum(protein*amount/reference_amount) from public.meal_items where project_id=p_project and logged_on=p_date),
  'carbs',(select sum(carbs*amount/reference_amount) from public.meal_items where project_id=p_project and logged_on=p_date),
  'fat',(select sum(fat*amount/reference_amount) from public.meal_items where project_id=p_project and logged_on=p_date),
  'missing_kcal',(select count(*) from public.meal_items where project_id=p_project and logged_on=p_date and kcal is null),
  'missing_protein',(select count(*) from public.meal_items where project_id=p_project and logged_on=p_date and protein is null),
  'missing_carbs',(select count(*) from public.meal_items where project_id=p_project and logged_on=p_date and carbs is null),
  'missing_fat',(select count(*) from public.meal_items where project_id=p_project and logged_on=p_date and fat is null)
) where exists(select 1 from public.projects where id=p_project);
$$;
create function public.food_calendar(p_project uuid,p_date date) returns table(day date,items bigint,confirmed boolean) language sql stable security invoker set search_path = '' as $$
select d::date,(select count(*) from public.meal_items where project_id=p_project and logged_on=d::date),
coalesce((select confirmed from public.meal_days where project_id=p_project and logged_on=d::date),false)
from generate_series(p_date::timestamp-interval '3 days',p_date::timestamp+interval '3 days',interval '1 day') d
where exists(select 1 from public.projects where id=p_project);
$$;
revoke all on function public.project_summary(uuid,date),public.food_calendar(uuid,date) from public;
grant execute on function public.project_summary(uuid,date),public.food_calendar(uuid,date) to authenticated;
commit;
