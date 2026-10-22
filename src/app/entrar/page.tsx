import { ClearOfflineData } from "@/components/offline-snapshot";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/painel");
  }
  return <section className="auth-card"><ClearOfflineData /><p className="eyebrow">BEM-VINDO AO DIAZEN</p><h1>Sua jornada<br />continua aqui.</h1><p className="intro">Entre com seu e-mail e senha.</p>{params.link === "invalido" && <p role="alert" className="form-error">O link expirou ou é inválido. Solicite novas instruções.</p>}<LoginForm configured={Boolean(supabase)} /><nav aria-label="Acesso à conta"><Link className="back-link" href="/recuperar-senha">Esqueci minha senha</Link><br /><Link className="back-link" href="/cadastro">Criar minha conta</Link></nav><Link className="back-link" href="/">Voltar ao início</Link></section>;
}
