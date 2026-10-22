begin;
-- Não depender dos default privileges do projeto Supabase: TRUNCATE ignora RLS.
DO $$ declare t text; begin
  foreach t in array array['projects','water_goals','water_entries','weights','measurements','activities','meal_items','meal_days','photos'] loop
    execute format('revoke all on public.%I from authenticated,anon',t);
    execute format('grant select,insert,update on public.%I to authenticated',t);
    if t not in ('projects','water_goals') then execute format('grant delete on public.%I to authenticated',t); end if;
    execute format('grant all on public.%I to service_role',t);
    execute format('drop policy read_owner on public.%I',t);
    execute format('drop policy insert_owner on public.%I',t);
    execute format('drop policy update_owner on public.%I',t);
    execute format('create policy read_owner on public.%I for select to authenticated using (user_id=(select auth.uid()) and private.owner_enabled(user_id))',t);
    execute format('create policy insert_owner on public.%I for insert to authenticated with check (user_id=(select auth.uid()) and private.owner_enabled(user_id))',t);
    execute format('create policy update_owner on public.%I for update to authenticated using (user_id=(select auth.uid()) and private.owner_enabled(user_id)) with check (user_id=(select auth.uid()) and private.owner_enabled(user_id))',t);
  end loop;
  foreach t in array array['audit_events','account_deletions','deletion_ledger','photo_cleanup'] loop
    execute format('revoke all on public.%I from authenticated,anon',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
revoke all on sequence public.audit_events_id_seq from authenticated,anon;
grant usage,select on sequence public.audit_events_id_seq to service_role;
create function private.guard_goal_period() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from public.water_goals where project_id=old.id and (effective_from<new.starts_on or (new.ends_on is not null and effective_from>new.ends_on))) then raise exception 'O período deve conter todas as versões de meta já configuradas'; end if;
  return new;
end $$;
revoke all on function private.guard_goal_period() from public;
create trigger guard_goal_period before update of starts_on,ends_on on public.projects for each row execute function private.guard_goal_period();
commit;
