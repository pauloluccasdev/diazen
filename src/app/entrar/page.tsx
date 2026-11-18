import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell>
      <ClearOfflineData />
      <h1>Entrar na conta</h1>
      <p className="auth-v2-intro">Acesse seu Diazen e continue evoluindo.</p>
      {params.link === "invalido" && (
        <p role="alert" className="auth-v2-error">
          O link expirou, já foi usado ou foi aberto em outro navegador. Se você
          confirmou o e-mail, tente entrar na conta. Para recuperar a senha,
          solicite outro link neste navegador.
        </p>
      )}
      <LoginForm configured={Boolean(supabase)} />
      <p className="auth-v2-footer">
        Não tem uma conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </AuthShell>
  );
}
