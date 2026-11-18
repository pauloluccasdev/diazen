"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  UserRound,
  Mail,
  MailCheck,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  signUp,
  recoverPassword,
  updatePassword,
} from "@/app/cadastro/actions";
import { PasswordInput } from "@/components/password-input";
import { AuthField } from "@/components/auth/auth-field";
import { useOnline } from "@/lib/use-online";

export function AccountForm({
  mode,
  configured,
}: {
  mode: "signup" | "recover" | "update";
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(
    mode === "signup"
      ? signUp
      : mode === "recover"
        ? recoverPassword
        : updatePassword,
    { error: "", message: "" },
  );
  const [, start] = useTransition();
  const form = useRef<HTMLFormElement>(null),
    error = useRef<HTMLParagraphElement>(null);
  const online = useOnline();
  const disabled = pending || !online || !configured;
  useEffect(() => {
    if (state.error) error.current?.focus();
    else if (state.message) form.current?.reset();
  }, [state]);
  const SuccessIcon = mode === "update" ? ShieldCheck : MailCheck;
  return (
    <form
      ref={form}
      action={action}
      className="auth-form auth-v2-form"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (!navigator.onLine || disabled) return;
        const data = new FormData(event.currentTarget);
        start(() => action(data));
      }}
    >
      {mode === "signup" && (
        <AuthField
          id="display-name"
          label="Nome de exibição (opcional)"
          icon={UserRound}
        >
          <input
            id="display-name"
            name="display_name"
            autoComplete="nickname"
            disabled={disabled}
            aria-invalid={Boolean(state.fieldErrors?.display_name)}
            aria-describedby={`display-name-help${state.fieldErrors?.display_name ? " auth-form-error" : ""}`}
          />
        </AuthField>
      )}
      {mode === "signup" && (
        <p id="display-name-help" className="auth-field-hint">
          Até 80 caracteres. Você pode editar no perfil.
        </p>
      )}
      {mode !== "update" && (
        <AuthField id="email" label="E-mail" icon={Mail}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={disabled}
          />
        </AuthField>
      )}
      {mode !== "recover" && (
        <>
          <AuthField
            id="password"
            label={mode === "update" ? "Nova senha" : "Senha"}
            icon={LockKeyhole}
          >
            <PasswordInput
              id="password"
              visibilityLabel={mode === "update" ? "nova senha" : "senha"}
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              disabled={disabled}
              aria-describedby="password-help"
            />
          </AuthField>
          <p id="password-help" className="auth-field-hint">
            Use de 12 a 128 caracteres.
          </p>
          <AuthField
            id="confirmation"
            label="Confirme a senha"
            icon={LockKeyhole}
          >
            <PasswordInput
              id="confirmation"
              visibilityLabel="confirmação da senha"
              name="confirmation"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              disabled={disabled}
            />
          </AuthField>
        </>
      )}
      {state.error && (
        <p
          ref={error}
          id="auth-form-error"
          tabIndex={-1}
          role="alert"
          className="auth-v2-error"
        >
          {state.error}
        </p>
      )}
      {!configured && (
        <p role="status" className="auth-v2-notice">
          Este recurso ainda não está disponível. Volte em breve.
        </p>
      )}
      {!online && (
        <p role="status" className="auth-v2-notice">
          Conecte-se à internet para continuar.
        </p>
      )}
      <button type="submit" className="button-primary" disabled={disabled}>
        {pending
          ? "Aguarde…"
          : mode === "signup"
            ? "Criar conta"
            : mode === "recover"
              ? "Enviar link"
              : "Salvar nova senha"}
      </button>
      {state.message ? (
        <div className="auth-feedback-card is-success">
          <SuccessIcon size={27} aria-hidden="true" />
          <p role="status">{state.message}</p>
        </div>
      ) : (
        mode === "recover" && (
          <div className="auth-feedback-card">
            <Mail size={27} aria-hidden="true" />
            <p>
              Você receberá um link de recuperação se houver uma conta para esse
              e-mail.
            </p>
          </div>
        )
      )}
      {mode === "update" && state.message && (
        <Link className="auth-continue-link" href="/painel">
          Continuar para o painel
        </Link>
      )}
    </form>
  );
}
