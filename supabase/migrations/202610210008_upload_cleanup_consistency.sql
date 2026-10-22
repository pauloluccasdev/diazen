begin;
-- A fila precisa sobreviver a uploads em andamento quando Auth já foi excluído.
-- Ela contém apenas referências privadas até a remoção confirmada dos objetos.
alter table public.photo_cleanup drop constraint photo_cleanup_user_id_fkey;
commit;
