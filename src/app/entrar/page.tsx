import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Login() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/painel");
  }
  return <section className="auth-card"><p className="eyebrow">BEM-VINDO AO DIAZEN</p><h1>Sua jornada<br />continua aqui.</h1><p className="intro">Entre com seu e-mail e senha.</p><LoginForm configured={Boolean(supabase)} /><Link className="back-link" href="/">Voltar ao início</Link></section>;
}
