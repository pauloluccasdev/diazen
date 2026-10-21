import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar acesso" };
export default function Recover() {
  return <section className="auth-card"><p className="eyebrow">RECUPERAR ACESSO</p><h1>Vamos recomeçar.</h1><p className="intro">Informe seu e-mail para receber as instruções.</p><AccountForm mode="recover" configured={Boolean(getSupabaseConfig() && siteUrl())} /><Link className="back-link" href="/entrar">Voltar para entrar</Link></section>;
}
