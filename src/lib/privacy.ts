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
export async function cleanPhotoJobs(
  admin: SupabaseClient,
  userId?: string,
  maxJobs = Infinity,
) {
  let count = 0;
  while (count < maxJobs) {
    let query = admin
      .from("photo_cleanup")
      .select("*")
      .limit(Math.min(100, maxJobs - count));
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw new Error("Falha ao consultar limpeza");
    if (!data?.length) break;
    for (const job of data) {
      // Um upload pode ter sido confirmado mesmo após falha na resposta HTTP.
      const { data: photo, error: verificationError } = await admin
        .from("photos")
        .select("*")
        .eq("id", job.photo_id)
        .maybeSingle();
      if (verificationError)
        throw new Error("Falha ao verificar arquivo pendente");
      if (
        photo &&
        photo.user_id === job.user_id &&
        job.paths.includes(photo.storage_key) &&
        job.paths.includes(photo.thumbnail_key)
      ) {
        const { error } = await admin
          .from("photo_cleanup")
          .delete()
          .eq("photo_id", job.photo_id);
        if (error) throw new Error("Falha ao concluir verificação");
        count++;
        continue;
      }
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

export async function reconcilePhotoStorage(
  admin: SupabaseClient,
  now = Date.now(),
) {
  const bucket = admin.storage.from("body-photos");
  let removed = 0;
  async function list(prefix: string) {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("Falha ao listar armazenamento");
      all.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return all;
  }
  for (const folder of await list("")) {
    if (folder.id !== null || !/^[0-9a-f-]{36}$/i.test(folder.name)) continue;
    const { data: account, error: accountError } =
      await admin.auth.admin.getUserById(folder.name);
    const deleted =
      accountError?.status === 404 && accountError?.code === "user_not_found";
    if (accountError && !deleted)
      throw new Error("Falha ao verificar proprietário");
    if (!deleted && !account?.user)
      throw new Error("Proprietário indisponível");
    for (const project of await list(folder.name)) {
      if (project.id !== null || !/^[0-9a-f-]{36}$/i.test(project.name))
        continue;
      const prefix = `${folder.name}/${project.name}`;
      for (const file of await list(prefix)) {
        if (!file.id) continue;
        const id = file.name.replace(/(-thumb)?\.webp$/, "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) continue;
        const path = `${prefix}/${file.name}`;
        // Aguardar 24h antes de tratar uploads sem metadados de contas vivas.
        if (!deleted) {
          if (!file.created_at) continue;
          const created = Date.parse(file.created_at);
          if (!Number.isFinite(created) || now - created < 24 * 60 * 60 * 1000)
            continue;
          const { data: photo, error } = await admin
            .from("photos")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (error) throw new Error("Falha ao verificar referência");
          if (
            photo &&
            (photo.storage_key === path || photo.thumbnail_key === path)
          )
            continue;
        }
        const { error } = await bucket.remove([path]);
        if (error) throw new Error("Falha ao remover órfão");
        removed++;
      }
    }
  }
  return removed;
}
