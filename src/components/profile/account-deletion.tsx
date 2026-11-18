import { PasswordInput } from "@/components/password-input";
import { ActionForm } from "@/components/forms/action-form";
import { deleteAccount } from "@/app/painel/perfil/actions";
export function AccountDeletion() {
  return (
    <section
      className="content-card profile-panel profile-danger"
      id="conta"
      aria-labelledby="account-title"
    >
      <h2 id="account-title">Gerenciar conta</h2>
      <p>
        A solicitação bloqueia o acesso aos seus dados imediatamente. Projetos,
        registros e arquivos privados serão excluídos com segurança.
      </p>
      <details>
        <summary>Solicitar exclusão da conta</summary>
        <ActionForm action={deleteAccount} submit="Excluir minha conta">
          <label htmlFor="deletion-password">Senha atual</label>
          <PasswordInput
            id="deletion-password"
            visibilityLabel="senha atual"
            name="password"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
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
  );
}
