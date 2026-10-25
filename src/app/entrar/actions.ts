"use server";
import { clearLegacyIntegrationCookies } from "@/lib/legacy-integration-cookies";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function signIn(
  _previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length > 1024
  ) {
    return { error: "Informe um e-mail válido e sua senha." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return {
      error: "O acesso ainda não está disponível. Tente novamente mais tarde.",
    };
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return {
        error:
          "Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.",
      };
  } catch {
    return {
      error:
        "Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.",
    };
  }
  redirect("/painel");
}

export async function signOut(): Promise<{ error: string }> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) return { error: "Não foi possível sair. Tente novamente." };
    } catch {
      return { error: "Não foi possível sair. Tente novamente." };
    }
  }
  await clearLegacyIntegrationCookies();
  redirect("/entrar");
}
