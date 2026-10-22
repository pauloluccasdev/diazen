import Link from "next/link";
import {
  UserRound,
  FolderOpen,
  Target,
  ShieldCheck,
  FileText,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { requireAccount } from "@/lib/data";
import { LogoutButton } from "@/components/logout-button";
import { ActionForm } from "@/components/forms/action-form";
import { deleteAccount } from "./actions";
export const metadata = { title: "Minha conta e privacidade" };
export default async function Profile() {
  const { user } = await requireAccount();
  return (
    <>
      <section className="welcome">
        <p className="eyebrow">SEU ESPAÇO PESSOAL</p>
        <h1>Conta e privacidade.</h1>
        <p className="intro">Sua rotina, seus dados e suas preferências.</p>
      </section>
      <section className="profile-identity content-card" aria-label="Sua conta">
        <span className="profile-avatar">
          <UserRound size={28} aria-hidden="true" />
        </span>
        <div>
          <h2>Sua conta Diazen</h2>
          <p className="muted">{user.email}</p>
        </div>
      </section>
      <nav
        className="settings-list content-card"
        aria-label="Configurações da conta"
      >
        {(
          [
            ["/painel/projetos", "Projetos", FolderOpen],
            ["/painel/projetos", "Metas", Target],
            ["/privacidade", "Dados e privacidade", ShieldCheck],
            ["/termos", "Termos de uso", FileText],
            ["/nova-senha", "Alterar senha", KeyRound],
          ] as const
        ).map(([href, label, Icon]) => (
          <Link key={label} href={href}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <section className="content-card">
        <h2>Seus dados, com você.</h2>
        <p className="intro">
          Baixe seus projetos, metas e registros em JSON. As fotografias podem
          ser salvas pela galeria, em suas versões otimizadas.
        </p>
        <a className="button-primary" href="/api/exportar" download>
          Baixar meus dados
        </a>
      </section>
      <section className="content-card">
        <h2>Encerrar minha conta</h2>
        <p className="intro">
          A solicitação bloqueia o acesso aos seus dados imediatamente.
          Projetos, registros e fotos serão excluídos com segurança. A política
          de privacidade descreve o tratamento das cópias de segurança.
        </p>
        <details>
          <summary>Solicitar exclusão da conta</summary>
          <ActionForm action={deleteAccount} submit="Excluir minha conta">
            <label>
              Senha atual
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                maxLength={1024}
              />
            </label>
            <label>
              Digite EXCLUIR para confirmar
              <input
                name="confirmation"
                required
                pattern="EXCLUIR"
                autoComplete="off"
              />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="confirm" required />
              Entendo que meus dados e fotos serão excluídos e não poderei
              recuperá-los.
            </label>
          </ActionForm>
        </details>
      </section>
      <LogoutButton />
    </>
  );
}
