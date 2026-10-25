"use server";
import { clearStrava, stravaSession, stravaConfig } from "@/lib/strava-server";
import { revokeStrava } from "@/lib/strava-provider";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAccount } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeAccount } from "@/lib/privacy";
import type { FormResult } from "@/components/forms/action-form";
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
  const strava = await stravaSession(user.id);
  try {
    const config = stravaConfig();
    if (strava && config)
      await revokeStrava(config.id, config.secret, strava.refresh_token);
  } catch {
    /* O acesso local será removido independentemente da resposta externa. */
  }
  await clearStrava();
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
