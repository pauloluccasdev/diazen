import type { SupabaseClient } from "@supabase/supabase-js";
// Sem acesso a variáveis: o chamador deve fornecer um client administrativo.
// Nenhuma função pode excluir uma conta que não solicitou exclusão previamente.
export async function purgeAccount(admin: SupabaseClient, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId))
    throw new Error("Identificador inválido");
  const { data: pending, error } = await admin
    .from("account_deletions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Falha ao consultar solicitação");
  if (!pending) return false;
  async function removePrefix(prefix: string, depth: number) {
    if (depth > 3) throw new Error("Estrutura de arquivos inesperada");
    while (true) {
      const { data, error } = await admin.storage
        .from("body-photos")
        .list(prefix, {
          limit: 100,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw new Error("Falha ao listar arquivos");
      if (!data?.length) break;
      const paths: string[] = [];
      for (const item of data) {
        if (item.id === null)
          await removePrefix(`${prefix}/${item.name}`, depth + 1);
        else paths.push(`${prefix}/${item.name}`);
      }
      if (paths.length) {
        const { error } = await admin.storage.from("body-photos").remove(paths);
        if (error) throw new Error("Falha ao remover arquivos");
      }
    }
  }
  await removePrefix(userId, 0);
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) throw new Error("Falha ao remover conta");
  const { error: ledgerError } = await admin
    .from("deletion_ledger")
    .update({ purged_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (ledgerError) throw new Error("Falha ao concluir registro de exclusão");
  return true;
}
export async function cleanPhotoJobs(admin: SupabaseClient) {
  let count = 0;
  while (true) {
    const { data, error } = await admin
      .from("photo_cleanup")
      .select("*")
      .limit(100);
    if (error) throw new Error("Falha ao consultar limpeza");
    if (!data?.length) break;
    for (const job of data) {
      const { error } = await admin.storage
        .from("body-photos")
        .remove(job.paths);
      if (error) throw new Error("Falha ao limpar arquivos");
      const { error: deleteError } = await admin
        .from("photo_cleanup")
        .delete()
        .eq("photo_id", job.photo_id);
      if (deleteError) throw new Error("Falha ao concluir limpeza");
      count++;
    }
  }
  return count;
}
