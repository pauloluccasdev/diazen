-- Exclusão integral explicitamente autorizada pelo proprietário, inclusive históricos.
begin;
create function public.delete_project(p_project uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); project public.projects;
begin
  if owner_id is null or not private.owner_enabled(owner_id) then
    raise exception 'Conta indisponível';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select * into project from public.projects where id=p_project and user_id=owner_id for update;
  if project.id is null or p_name is distinct from project.name then
    raise exception 'Confirmação de projeto inválida';
  end if;
  -- Os FKs removem os dados operacionais. O trigger das fotos mantém fila durável
  -- de limpeza de objetos privados. A execução definer permite apagar histórico
  -- sem liberar edição de registros encerrados nem DELETE direto em projects.
  delete from public.projects where id=project.id and user_id=owner_id;
  delete from public.food_copy_requests where user_id=owner_id and parameters->>0=project.id::text;
  delete from public.audit_events where project_id=project.id and user_id=owner_id;
end $$;
revoke all on function public.delete_project(uuid,text) from public,anon;
grant execute on function public.delete_project(uuid,text) to authenticated;
commit;
