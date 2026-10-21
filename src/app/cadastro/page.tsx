import Link from "next/link";
import { AccountForm } from "@/components/account-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "Criar conta" };
export default function Signup() {
  return <section className="auth-card"><p className="eyebrow">SEU PRIMEIRO PASSO</p><h1>Comece sua jornada.</h1><p className="intro">Só precisamos de e-mail e senha para criar seu espaço.</p><AccountForm mode="signup" configured={Boolean(getSupabaseConfig() && siteUrl())} /><Link className="back-link" href="/entrar">Já tenho conta</Link></section>;
}
