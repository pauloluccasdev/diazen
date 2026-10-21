"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export type AccountState = { error: string; message: string };
const unavailable = { error: "Não foi possível concluir agora. Tente novamente mais tarde.", message: "" };
const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function passwordError(form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password.length < 12 || password.length > 128) return "Use uma senha com 12 a 128 caracteres.";
  if (password !== String(form.get("confirmation") ?? "")) return "As senhas precisam ser iguais.";
  return null;
}
export async function signUp(_state: AccountState, form: FormData): Promise<AccountState> {
  const email = String(form.get("email") ?? "").trim();
  const error = passwordError(form);
  if (!validEmail(email)) return { error: "Informe um e-mail válido.", message: "" };
  if (error) return { error, message: "" };
  const supabase = await createSupabaseServerClient();
  const origin = siteUrl();
  if (!supabase || !origin) return unavailable;
  let signedIn = false;
  try {
    const { data, error: failure } = await supabase.auth.signUp({ email, password: String(form.get("password")), options: { emailRedirectTo: `${origin}/auth/confirmar` } });
    // Sucesso aparente para conta já existente e para erros do provedor: não enumerar e-mails.
    signedIn = !failure && Boolean(data.session);
  } catch { return unavailable; }
  if (signedIn) redirect("/painel");
  return { error: "", message: "Se o cadastro puder ser concluído, você receberá um e-mail com os próximos passos. Confira também o spam." };
}
export async function recoverPassword(_state: AccountState, form: FormData): Promise<AccountState> {
  const email = String(form.get("email") ?? "").trim();
  if (!validEmail(email)) return { error: "Informe um e-mail válido.", message: "" };
  const supabase = await createSupabaseServerClient();
  const origin = siteUrl();
  if (!supabase || !origin) return unavailable;
  try { await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirmar` }); }
  catch { return unavailable; }
  return { error: "", message: "Se houver uma conta para esse e-mail, você receberá as instruções de recuperação. Confira também o spam." };
}
export async function updatePassword(_state: AccountState, form: FormData): Promise<AccountState> {
  const error = passwordError(form);
  if (error) return { error, message: "" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return unavailable;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Solicite um novo link de recuperação.", message: "" };
  try {
    const { error: failure } = await supabase.auth.updateUser({ password: String(form.get("password")) });
    if (failure) return unavailable;
  } catch { return unavailable; }
  return { error: "", message: "Senha atualizada. Você já pode continuar para o painel." };
}
