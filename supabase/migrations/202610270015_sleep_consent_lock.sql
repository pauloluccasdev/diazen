-- Serializa consentimento e gravações para impedir persistência após confirmar pausa.
begin;
create or replace function public.set_garmin_sleep_sync(p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid();
begin
 if u is null or p_enabled is null or not private.owner_enabled(u) then raise exception 'Conta indisponível';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 insert into public.garmin_sleep_settings(user_id,enabled,enabled_at) values(u,p_enabled,case when p_enabled then now() end)
 on conflict(user_id) do update set enabled=excluded.enabled,
 enabled_at=case when excluded.enabled and not garmin_sleep_settings.enabled then now() else garmin_sleep_settings.enabled_at end,
 last_attempt_at=case when excluded.enabled and not garmin_sleep_settings.enabled then null else garmin_sleep_settings.last_attempt_at end,
 lease_id=case when not excluded.enabled then null else garmin_sleep_settings.lease_id end,
 lease_until=case when not excluded.enabled then null else garmin_sleep_settings.lease_until end;
end $$;
revoke all on function public.set_garmin_sleep_sync(boolean) from public,anon;
grant execute on function public.set_garmin_sleep_sync(boolean) to authenticated;

commit;
