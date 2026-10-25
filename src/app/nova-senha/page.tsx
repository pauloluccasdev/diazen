import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Nova senha" };
export default async function NewPassword() {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/recuperar-senha");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/recuperar-senha");
  return (
    <section className="auth-card">
      <p className="eyebrow">ACESSO RECUPERADO</p>
      <h1>Escolha sua nova senha.</h1>
      <AccountForm mode="update" configured />
    </section>
  );
}
