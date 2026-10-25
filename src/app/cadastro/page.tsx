import { ReturnLink } from "@/components/return-link";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta" };
export default function Signup() {
  return (
    <section className="auth-card">
      <Link className="auth-brand brand" href="/" aria-label="Diazen, início">
        dia<span>zen.</span>
      </Link>
      <p className="auth-tagline">Sua rotina. Sua evolução.</p>
      <h1 className="auth-title">Comece sua jornada.</h1>
      <nav className="auth-tabs" aria-label="Entrar ou criar conta">
        <Link href="/entrar">Entrar</Link>
        <span aria-current="page">Criar conta</span>
      </nav>
      <p className="intro">
        Só precisamos de e-mail e senha para criar seu espaço.
      </p>
      <AccountForm
        mode="signup"
        configured={Boolean(getSupabaseConfig() && siteUrl())}
      />
      <p className="intro">
        Conheça os <Link href="/termos">termos de uso</Link> e a{" "}
        <Link href="/privacidade">política de privacidade</Link>.
      </p>
      <ReturnLink href="/entrar">Já tenho conta</ReturnLink>
    </section>
  );
}
