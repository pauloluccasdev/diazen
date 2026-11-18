"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { Mail, LockKeyhole } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { AuthField } from "@/components/auth/auth-field";
import { useOnline } from "@/lib/use-online";
import { signIn } from "@/app/entrar/actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  const [, start] = useTransition();
  const error = useRef<HTMLParagraphElement>(null);
  const online = useOnline();
  const disabled = pending || !configured || !online;
  useEffect(() => {
    if (state.error) error.current?.focus();
  }, [state]);
  return (
    <form
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
      <AuthField id="email" label="E-mail" icon={Mail}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          disabled={disabled}
        />
      </AuthField>
      <AuthField id="password" label="Senha" icon={LockKeyhole}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          disabled={disabled}
        />
      </AuthField>
      <Link className="auth-recovery-link" href="/recuperar-senha">
        Esqueci minha senha
      </Link>
      {state.error && (
        <p ref={error} tabIndex={-1} className="auth-v2-error" role="alert">
          {state.error}
        </p>
      )}
      {!configured && (
        <p className="auth-v2-notice" role="status">
          O acesso ainda não está disponível. Volte em breve.
        </p>
      )}
      {!online && (
        <p className="auth-v2-notice" role="status">
          Conecte-se à internet para entrar.
        </p>
      )}
      <button className="button-primary" type="submit" disabled={disabled}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
