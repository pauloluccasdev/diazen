begin;
-- Registro mínimo, administrativo, separado do usuário excluído. Deve ser
-- preservado fora do backup restaurado para não reintroduzir contas apagadas.
create table public.deletion_ledger (
  user_id uuid primary key, requested_at timestamptz not null default now(), purged_at timestamptz
);
alter table public.deletion_ledger enable row level security;
revoke all on public.deletion_ledger from authenticated,anon;
create or replace function public.request_account_deletion() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
  insert into public.account_deletions(user_id) values(auth.uid()) on conflict do nothing;
  insert into public.deletion_ledger(user_id) values(auth.uid()) on conflict do nothing;
end $$;
commit;
