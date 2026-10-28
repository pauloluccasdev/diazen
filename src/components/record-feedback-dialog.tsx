"use client";
import { useEffect, useId, useRef } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

export function RecordFeedbackDialog({
  message,
  error,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const title = useId();
  const description = useId();
  useEffect(() => {
    dialog.current?.showModal();
    button.current?.focus({ preventScroll: true });
  }, []);
  const Icon = error ? CircleAlert : CheckCircle2;
  return (
    <dialog
      ref={dialog}
      className={`record-feedback-dialog${error ? " is-error" : ""}`}
      aria-labelledby={title}
      aria-describedby={description}
      onClose={onClose}
    >
      <span className="record-feedback-icon">
        <Icon size={30} aria-hidden="true" />
      </span>
      <h2 id={title}>
        {error ? "Não foi possível registrar" : "Registro salvo"}
      </h2>
      <p id={description} role={error ? "alert" : "status"}>
        {message}
      </p>
      <button
        ref={button}
        type="button"
        className="button-primary"
        onClick={() => dialog.current?.close()}
      >
        {error ? "Voltar ao formulário" : "Continuar"}
      </button>
    </dialog>
  );
}
