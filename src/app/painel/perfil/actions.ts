"use server";
import { clearLegacyIntegrationCookies } from "@/lib/legacy-integration-cookies";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAccount } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeAccount } from "@/lib/privacy";
import type { FormResult } from "@/components/forms/action-form";
import { revalidatePath } from "next/cache";
import { normalizeProfileName } from "@/lib/profile-values";

export async function saveProfileName(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const name = normalizeProfileName(form.get("display_name"));
  if (name.error)
    return {
      error: name.error,
      message: "",
      fieldErrors: { display_name: name.error },
    };
  const { error } = await client
    .rpc("save_profile_name", { p_name: name.value })
    .abortSignal(AbortSignal.timeout(30000));
  if (error)
    return {
      error: "Não foi possível atualizar seu nome. Tente novamente.",
      message: "",
    };
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message: name.value
      ? "Nome de exibição atualizado."
      : "Nome de exibição removido.",
  };
}
export async function deleteAccount(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client, user } = await requireAccount();
  if (form.get("confirmation") !== "EXCLUIR" || form.get("confirm") !== "on")
    return {
      error: "Digite EXCLUIR e confirme que deseja excluir sua conta.",
      message: "",
    };
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024 || !user.email)
    return { error: "Confirme sua senha atual.", message: "" };
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error || data.user?.id !== user.id)
    return {
      error: "Não foi possível confirmar seu acesso. Confira a senha.",
      message: "",
    };
  const { error: requestError } = await client.rpc("request_account_deletion");
  if (requestError)
    return {
      error: "Não foi possível registrar a solicitação. Tente novamente.",
      message: "",
    };
  await clearLegacyIntegrationCookies();
  // Após o tombstone, JWTs anteriores já não conseguem ler os dados pelo RLS.
  await client.auth.signOut({ scope: "global" });
  const admin = createAdminClient();
  if (admin) {
    try {
      await purgeAccount(admin, user.id);
    } catch {
      console.error(
        JSON.stringify({
          event: "privacy_purge_pending",
          at: new Date().toISOString(),
        }),
      );
    }
  }
  const jar = await cookies();
  for (const cookie of jar.getAll())
    if (cookie.name.startsWith("sb-")) jar.delete(cookie.name);
  redirect("/conta-excluida");
}
