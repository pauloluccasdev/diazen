import { AuthShell } from "@/components/auth/auth-shell";
import { AccountForm } from "@/components/account-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar senha" };
export default function Recover() {
  return (
    <AuthShell back="/entrar">
      <h1>Recuperar senha</h1>
      <p className="auth-v2-intro">
        Informe seu e-mail para receber o link de redefinição.
      </p>
      <AccountForm
        mode="recover"
        configured={Boolean(getSupabaseConfig() && siteUrl())}
      />
    </AuthShell>
  );
}
