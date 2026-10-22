import Link from "next/link";
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
        <p className="intro">{user.email}</p>
      </section>
      <section className="content-card">
        <h2>Seus dados, com você.</h2>
        <p className="intro">
          Baixe seus projetos, metas e registros em JSON. As fotografias podem
          ser salvas pela galeria, em suas versões otimizadas.
        </p>
        <a className="button-primary" href="/api/exportar" download>
          Baixar meus dados
        </a>
        <nav className="panel-nav">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/nova-senha">Alterar senha</Link>
        </nav>
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
