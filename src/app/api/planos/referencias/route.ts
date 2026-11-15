import { apiAccount } from "@/lib/api-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizePhoto, MAX_IMAGE_BYTES } from "@/lib/images";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
const reply = (message: string, status: number) =>
  Response.json(
    { message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return reply("Origem não autorizada.", 403);
  const account = await apiAccount();
  if (!account) return reply("Entre novamente para continuar.", 401);
  const admin = createAdminClient();
  if (!admin)
    return reply("Envio de referências temporariamente indisponível.", 503);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    return reply("Arquivo inválido.", 400);
  const maxBody = 4 * 1024 * 1024;
  const reader = request.body?.getReader();
  if (!reader) return reply("Arquivo inválido.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBody) {
      await reader.cancel();
      return reply("Envie uma imagem menor.", 413);
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    return reply("Arquivo inválido.", 400);
  }
  const file = form.get("file"),
    name = String(
      form.get("name") ??
        (file instanceof File ? file.name : "Referência visual"),
    ).trim();
  if (
    !(file instanceof File) ||
    file.size > MAX_IMAGE_BYTES ||
    !name ||
    name.length > 120
  )
    return reply("Confira o arquivo e o nome da referência.", 400);
  const { client, user } = account;
  const { data: active, error: activeError } = await client
    .from("projects")
    .select("*")
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (activeError || !active)
    return reply("Ative um projeto para enviar referências.", 400);
  let optimized;
  try {
    optimized = await optimizePhoto(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return reply(
      "Não foi possível ler a imagem. Use JPG, PNG ou WebP e tente uma imagem menor.",
      400,
    );
  }
  const id = crypto.randomUUID(),
    key = `${user.id}/${active.id}/${id}.webp`;
  const bucket = admin.storage.from("body-photos");
  try {
    const full = await bucket.upload(key, optimized.full, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (full.error) throw new Error("upload");
    const { error } = await client
      .from("plan_assets")
      .insert({ id, project_id: active.id, name, storage_key: key });
    if (error) throw new Error("metadata");
  } catch {
    // A conexão pode falhar depois do COMMIT. Confirmar antes de remover bytes
    // evita deixar um registro salvo apontando para arquivos apagados.
    const { data: committed, error: verificationError } = await admin
      .from("plan_assets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (
      !verificationError &&
      committed?.user_id === user.id &&
      committed.storage_key === key
    )
      return Response.json(
        { id, name, message: "Referência salva com privacidade." },
        { status: 201, headers: { "Cache-Control": "private, no-store" } },
      );
    if (verificationError) {
      await admin
        .from("plan_asset_cleanup")
        .upsert({ asset_id: id, user_id: user.id, paths: [key] });
    } else {
      const { error } = await bucket.remove([key]);
      if (error)
        await admin
          .from("plan_asset_cleanup")
          .upsert({ asset_id: id, user_id: user.id, paths: [key] });
    }
    return reply(
      "Não foi possível confirmar o envio. Confira suas referências antes de tentar novamente.",
      400,
    );
  }
  return Response.json(
    { id, name, message: "Referência salva com privacidade." },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
