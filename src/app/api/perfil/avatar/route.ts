import { revalidatePath } from "next/cache";
import { apiAccount } from "@/lib/api-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { isId } from "@/lib/domain";
import { legacyProfileName } from "@/lib/profile-values";
import { MAX_IMAGE_BYTES, optimizeAvatar } from "@/lib/images";
import { ImageRequestError, readImageForm } from "@/lib/image-request";
import { cleanAvatarJobs } from "@/lib/privacy";
export const runtime = "nodejs";
export const maxDuration = 60;
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
const reply = (message: string, status: number) =>
  Response.json({ message }, { status, headers: privateHeaders });
const allowedOrigin = (request: Request) =>
  Boolean(siteUrl()) && request.headers.get("origin") === siteUrl();
async function clean(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
) {
  try {
    await cleanAvatarJobs(admin, userId, 10);
  } catch {
    console.error(
      JSON.stringify({
        event: "avatar_cleanup_pending",
        at: new Date().toISOString(),
      }),
    );
  }
}

export async function GET(request: Request) {
  const account = await apiAccount();
  if (!account) return reply("Entre novamente para continuar.", 401);
  const { data: profile, error } = await account.client
    .from("profiles")
    .select("avatar_id,avatar_key")
    .eq("user_id", account.user.id)
    .maybeSingle();
  if (error) return reply("Não foi possível carregar sua foto.", 503);
  if (!profile?.avatar_key || !profile.avatar_id)
    return new Response(null, { status: 404, headers: privateHeaders });
  const { data, error: downloadError } = await account.client.storage
    .from("body-photos")
    .download(profile.avatar_key);
  if (downloadError || !data) {
    const missing =
      !data &&
      (!downloadError ||
        ("statusCode" in downloadError &&
          String(downloadError.statusCode) === "404"));
    return new Response(null, {
      status: missing ? 404 : 503,
      headers: privateHeaders,
    });
  }
  const download = new URL(request.url).searchParams.get("baixar") === "1";
  return new Response(data, {
    headers: {
      ...privateHeaders,
      "Content-Type": "image/webp",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="diazen-avatar.webp"`,
    },
  });
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return reply("Origem não autorizada.", 403);
  const account = await apiAccount();
  if (!account) return reply("Entre novamente para continuar.", 401);
  const admin = createAdminClient();
  if (!admin) return reply("Envio temporariamente indisponível.", 503);
  let optimized: Buffer;
  try {
    const form = await readImageForm(request),
      file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES || !file.size)
      return reply("Escolha uma imagem de até 3 MB.", 400);
    optimized = await optimizeAvatar(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof ImageRequestError)
      return reply(error.message, error.status);
    return reply("Não foi possível ler a imagem. Use JPG, PNG ou WebP.", 400);
  }
  const id = crypto.randomUUID(),
    userId = account.user.id;
  const key = `${userId}/avatars/${id}.webp`;
  const { error: queueError } = await admin.from("avatar_cleanup").insert({
    user_id: userId,
    avatar_id: id,
    available_after: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
  if (queueError)
    return reply("Não foi possível preparar o envio. Tente novamente.", 503);
  try {
    const { error: uploadError } = await admin.storage
      .from("body-photos")
      .upload(key, optimized, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) throw Error("upload");
    const { error } = await account.client
      .rpc("set_profile_avatar", {
        p_avatar: id,
        p_initial_name: legacyProfileName(
          account.user.user_metadata?.display_name,
        ),
      })
      .abortSignal(AbortSignal.timeout(30000));
    if (error) throw Error("metadata");
  } catch {
    let committed = false;
    try {
      const { data, error } = await admin
        .from("profiles")
        .select("avatar_id,avatar_key")
        .eq("user_id", userId)
        .abortSignal(AbortSignal.timeout(30000))
        .maybeSingle();
      committed = !error && data?.avatar_id === id && data.avatar_key === key;
    } catch {
      /* A fila conserva a tentativa até ser possível verificar. */
    }
    if (!committed)
      return reply(
        "Não foi possível confirmar o envio. Confira sua foto antes de tentar novamente.",
        503,
      );
  }
  await clean(admin, userId);
  revalidatePath("/painel", "layout");
  return reply("Foto de perfil atualizada com privacidade.", 201);
}

export async function DELETE(request: Request) {
  if (!allowedOrigin(request)) return reply("Origem não autorizada.", 403);
  const account = await apiAccount();
  if (!account) return reply("Entre novamente para continuar.", 401);
  const version = request.headers.get("x-diazen-avatar-id");
  if (
    request.headers.get("x-diazen-confirmation") !== "remover-avatar" ||
    !version ||
    !isId(version)
  )
    return reply("Confirme a remoção da foto de perfil.", 400);
  const admin = createAdminClient();
  if (!admin) return reply("Remoção temporariamente indisponível.", 503);
  const { data, error } = await account.client
    .rpc("remove_profile_avatar", { p_avatar: version })
    .abortSignal(AbortSignal.timeout(30000));
  if (error || !data) {
    const check = await account.client
      .from("profiles")
      .select("avatar_id")
      .eq("user_id", account.user.id)
      .maybeSingle();
    if (check.error)
      return reply(
        "Não foi possível confirmar a remoção. Confira sua foto antes de tentar novamente.",
        503,
      );
    if (check.data?.avatar_id)
      return reply(
        "Sua foto mudou. Feche a confirmação e confira a foto atual antes de remover.",
        409,
      );
  }
  await clean(admin, account.user.id);
  revalidatePath("/painel", "layout");
  return reply("Foto de perfil removida. Seu nome foi preservado.", 200);
}
