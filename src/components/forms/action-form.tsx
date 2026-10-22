"use client";
import { useActionState, useEffect, useRef, startTransition } from "react";
import { useOnline } from "@/lib/use-online";
export type FormResult = { error: string; message: string };
export type FormAction = (state: FormResult, form: FormData) => Promise<FormResult>;
export function ActionForm({ action, children, submit = "Salvar", className = "data-form" }: { action: FormAction; children: React.ReactNode; submit?: string; className?: string }) {
  const [state, dispatch, pending] = useActionState(action, { error: "", message: "" });
  const online = useOnline();
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.error) feedback.current?.focus(); }, [state]);
  return <form className={className} action={dispatch} onSubmit={(event) => {
    event.preventDefault();
    if (!navigator.onLine || pending) return;
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }}>
    <fieldset disabled={pending || !online}>{children}<button type="submit" className="button-primary">{pending ? "Salvando…" : submit}</button></fieldset>
    {state.error && <p className="form-error" role="alert" tabIndex={-1} ref={feedback}>{state.error}</p>}
    {state.message && <p className="form-success" role="status">{state.message}</p>}
    {!online && <p role="status">Sem conexão. As alterações estão bloqueadas.</p>}
  </form>;
}
