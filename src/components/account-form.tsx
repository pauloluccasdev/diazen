"use client";
import { useActionState } from "react";
import Link from "next/link";
import {
  signUp,
  recoverPassword,
  updatePassword,
} from "@/app/cadastro/actions";
import { PasswordInput } from "@/components/password-input";
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
  const online = useOnline();
  const disabled = pending || !online || !configured;
  return (
    <form
      action={action}
      className="auth-form"
      onSubmit={(e) => {
        if (!navigator.onLine) e.preventDefault();
      }}
    >
      {mode !== "update" && (
        <>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={disabled}
          />
        </>
      )}
      {mode !== "recover" && (
        <>
          <label htmlFor="password">
            {mode === "update" ? "Nova senha" : "Senha"}
          </label>
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
          <p id="password-help">Use de 12 a 128 caracteres.</p>
          <label htmlFor="confirmation">Confirme a senha</label>
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
        </>
      )}
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="intro">
          {state.message}
        </p>
      )}
      {!configured && (
        <p role="status" className="intro">
          Este recurso ainda não está disponível. Volte em breve.
        </p>
      )}
      {!online && <p role="status">Conecte-se à internet para continuar.</p>}
      <button type="submit" className="button-primary" disabled={disabled}>
        {pending
          ? "Aguarde…"
          : mode === "signup"
            ? "Criar conta"
            : mode === "recover"
              ? "Enviar instruções"
              : "Salvar nova senha"}
      </button>
      {mode === "update" && state.message && (
        <Link className="back-link" href="/painel">
          Continuar para o painel
        </Link>
      )}
    </form>
  );
}
