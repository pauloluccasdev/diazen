import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta" };
export default function Signup() {
  return (
    <AuthShell back="/entrar">
      <h1>Criar sua conta</h1>
      <p className="auth-v2-intro">
        Comece hoje a organizar sua rotina e acompanhar sua evolução.
      </p>
      <AccountForm
        mode="signup"
        configured={Boolean(getSupabaseConfig() && siteUrl())}
      />
      <p className="auth-legal-notice">
        Conheça os <Link href="/termos">Termos de Uso</Link> e a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <p className="auth-v2-footer">
        Já tem uma conta? <Link href="/entrar">Entrar</Link>
      </p>
    </AuthShell>
  );
}
