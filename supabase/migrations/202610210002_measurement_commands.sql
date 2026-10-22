begin;
create function public.save_weight(p_date date,p_kg numeric) returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.weights(logged_on,kg) values(p_date,p_kg)
    on conflict(user_id,logged_on) do update set kg = excluded.kg;
end $$;
create function public.save_measurements(p_date date,p_values jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare k text; v text;
begin
  if jsonb_typeof(p_values) <> 'object' or p_values = '{}'::jsonb then raise exception 'Informe pelo menos uma medida'; end if;
  for k,v in select * from jsonb_each_text(p_values) order by key loop
    insert into public.measurements(logged_on,measurement_type,value_cm) values(p_date,k,v::numeric)
      on conflict(user_id,logged_on,measurement_type) do update set value_cm = excluded.value_cm;
  end loop;
end $$;
revoke all on function public.save_weight(date,numeric) from public;
revoke all on function public.save_measurements(date,jsonb) from public;
grant execute on function public.save_weight(date,numeric),public.save_measurements(date,jsonb) to authenticated;
commit;
