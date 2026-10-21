import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Seu painel" };
export const dynamic = "force-dynamic";

export default async function Panel() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/entrar");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return <section className="welcome"><p className="eyebrow">SEU ESPAÇO</p><h1>Bem-vindo à sua jornada.</h1><p className="intro">Você entrou com segurança. A configuração de projetos estará disponível em breve.</p><LogoutButton /></section>;
}
