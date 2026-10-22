import { ClearOfflineData } from "@/components/offline-snapshot";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/painel");
  }
  return (
    <section className="auth-card">
      <ClearOfflineData />
      <Link className="auth-brand brand" href="/" aria-label="Diazen, início">
        dia<span>zen.</span>
      </Link>
      <p className="auth-tagline">Sua rotina. Sua evolução.</p>
      <h1 className="auth-title">Entrar na sua conta</h1>
      <nav className="auth-tabs" aria-label="Entrar ou criar conta">
        <span aria-current="page">Entrar</span>
        <Link href="/cadastro">Criar conta</Link>
      </nav>
      {params.link === "invalido" && (
        <p role="alert" className="form-error">
          O link expirou, já foi usado ou foi aberto em outro navegador. Se você
          confirmou o e-mail, tente entrar na conta. Para recuperar a senha,
          solicite outro link neste navegador.
        </p>
      )}
      <LoginForm configured={Boolean(supabase)} />
      <nav aria-label="Acesso à conta">
        <Link className="back-link" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
        <br />
        <Link className="back-link" href="/cadastro">
          Criar minha conta
        </Link>
      </nav>
      <Link className="back-link" href="/">
        Voltar ao início
      </Link>
    </section>
  );
}
