-- Correção aditiva: todos os prazos da fila usam o relógio do PostgreSQL.
begin;
alter table public.avatar_cleanup
 alter column available_after set default (now()+interval '15 minutes');

create function public.due_avatar_jobs(p_user_id uuid default null,p_limit integer default 100)
returns setof public.avatar_cleanup
language sql stable security invoker set search_path='' as $$
 select jobs.* from public.avatar_cleanup as jobs
 where jobs.available_after<=now() and (p_user_id is null or jobs.user_id=p_user_id)
 order by jobs.available_after,jobs.created_at
 limit least(greatest(coalesce(p_limit,100),1),100)
$$;
revoke all on function public.due_avatar_jobs(uuid,integer) from public,anon,authenticated;
grant execute on function public.due_avatar_jobs(uuid,integer) to service_role;
commit;
