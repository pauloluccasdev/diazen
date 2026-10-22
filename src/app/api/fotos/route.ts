import { apiAccount } from "@/lib/api-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { optimizePhoto, MAX_IMAGE_BYTES } from "@/lib/images";
import { siteUrl } from "@/lib/site-url";
import { isDate, today } from "@/lib/domain";
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
  if (!admin) return reply("Envio de fotos temporariamente indisponível.", 503);
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
    date = String(form.get("logged_on")),
    category = String(form.get("category"));
  if (
    !(file instanceof File) ||
    file.size > MAX_IMAGE_BYTES ||
    !isDate(date) ||
    date > today() ||
    !["front", "back", "side", "other"].includes(category)
  )
    return reply("Confira arquivo, data e categoria.", 400);
  const { client, user } = account;
  const { data: active, error: activeError } = await client
    .from("projects")
    .select("*")
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (
    activeError ||
    !active ||
    date < active.starts_on ||
    (active.ends_on && date > active.ends_on)
  )
    return reply("A foto precisa estar na vigência do projeto ativo.", 400);
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
    key = `${user.id}/${active.id}/${id}.webp`,
    thumb = `${user.id}/${active.id}/${id}-thumb.webp`;
  const bucket = admin.storage.from("body-photos");
  try {
    const full = await bucket.upload(key, optimized.full, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (full.error) throw new Error("upload");
    const small = await bucket.upload(thumb, optimized.thumbnail, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (small.error) throw new Error("upload");
    const { error } = await client.from("photos").insert({
      id,
      logged_on: date,
      category,
      storage_key: key,
      thumbnail_key: thumb,
    });
    if (error) throw new Error("metadata");
  } catch {
    // A conexão pode falhar depois do COMMIT. Confirmar antes de remover bytes
    // evita deixar um registro salvo apontando para arquivos apagados.
    const { data: committed, error: verificationError } = await admin
      .from("photos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (
      !verificationError &&
      committed?.user_id === user.id &&
      committed.storage_key === key &&
      committed.thumbnail_key === thumb
    )
      return reply("Foto salva com privacidade.", 201);
    if (verificationError) {
      await admin
        .from("photo_cleanup")
        .upsert({ photo_id: id, user_id: user.id, paths: [key, thumb] });
    } else {
      const { error } = await bucket.remove([key, thumb]);
      if (error)
        await admin
          .from("photo_cleanup")
          .upsert({ photo_id: id, user_id: user.id, paths: [key, thumb] });
    }
    return reply(
      "Não foi possível confirmar o envio. Confira a galeria antes de tentar novamente.",
      400,
    );
  }
  return reply("Foto salva com privacidade.", 201);
}
