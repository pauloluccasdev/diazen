"use client";

import { useActionState } from "react";
import { useOnline } from "@/lib/use-online";
import { signIn } from "@/app/entrar/actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  const online = useOnline();
  const unavailable = !configured || !online;
  return (
    <form
      action={action}
      className="auth-form"
      onSubmit={(event) => {
        if (!navigator.onLine) event.preventDefault();
      }}
    >
      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={254}
        disabled={pending || unavailable}
      />
      <label htmlFor="password">Senha</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={1024}
        disabled={pending || unavailable}
      />
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {!configured && (
        <p className="intro" role="status">
          O acesso ainda não está disponível. Volte em breve.
        </p>
      )}
      {!online && (
        <p className="intro" role="status">
          Conecte-se à internet para entrar.
        </p>
      )}
      <button
        className="button-primary"
        type="submit"
        disabled={pending || unavailable}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
