"use client";
import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, useFormFeedback } from "@/components/forms/action-form";
import { saveProfileName } from "@/app/painel/perfil/actions";
import { useDesktopTheme } from "@/components/shell/theme-context";

function NameField({ name }: { name: string | null }) {
  const id = useId(),
    { fieldErrors = {} } = useFormFeedback();
  return (
    <div className="profile-field">
      <label htmlFor={id}>Nome de exibição (opcional)</label>
      <input
        key={name ?? ""}
        id={id}
        name="display_name"
        autoComplete="nickname"
        defaultValue={name ?? ""}
        aria-invalid={Boolean(fieldErrors.display_name)}
        aria-describedby={`${id}-help${fieldErrors.display_name ? ` ${id}-error` : ""}`}
      />
      <p id={`${id}-help`} className="field-hint">
        Até 80 caracteres. Você pode deixar em branco.
      </p>
      {fieldErrors.display_name && (
        <p id={`${id}-error`} className="form-error">
          {fieldErrors.display_name}
        </p>
      )}
    </div>
  );
}
export function ProfileNameForm({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const id = useId();
  return (
    <ActionForm
      action={saveProfileName}
      submit="Salvar alterações"
      feedbackMode="modal"
    >
      <div className="profile-personal-fields">
        <NameField name={name} />
        <div className="profile-field">
          <label htmlFor={id}>E-mail de acesso</label>
          <input
            id={id}
            type="email"
            value={email ?? ""}
            readOnly
            autoComplete="email"
            aria-describedby={`${id}-help`}
          />
          <p id={`${id}-help`} className="field-hint">
            Usado na autenticação da sua conta.
          </p>
        </div>
      </div>
    </ActionForm>
  );
}
export function ProfileAppearance() {
  const { theme, setTheme } = useDesktopTheme(),
    id = useId();
  return (
    <div className="profile-appearance">
      <div>
        <span className="profile-field-label">Unidades</span>
        <strong>Métrico · kg, cm e ml</strong>
      </div>
      <div>
        <label htmlFor={id}>Tema do desktop</label>
        <select
          id={id}
          value={theme}
          onChange={(event) =>
            setTheme(event.target.value === "dark" ? "dark" : "light")
          }
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </div>
      <div>
        <span className="profile-field-label">Idioma</span>
        <strong>Português (Brasil)</strong>
      </div>
      <p className="field-hint">
        A aparência é salva neste navegador. No celular, o Diazen mantém o modo
        escuro.
      </p>
    </div>
  );
}

export function ProfileRetry({ label }: { label: string }) {
  const router = useRouter(),
    [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="button-secondary"
      disabled={pending}
      aria-busy={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? "Tentando novamente…" : label}
    </button>
  );
}
