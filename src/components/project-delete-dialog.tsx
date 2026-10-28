"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/app/painel/projetos/actions";
import { useOnline } from "@/lib/use-online";

export function ProjectDeleteDialog({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button-secondary project-delete-trigger"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={20} aria-hidden="true" />
        Excluir projeto
      </button>
      {open && (
        <Confirmation
          id={id}
          name={name}
          active={active}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function Confirmation({
  id,
  name,
  active,
  close,
}: {
  id: string;
  name: string;
  active: boolean;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const title = useId(),
    description = useId(),
    formId = useId();
  const online = useOnline();
  const [state, action, pending] = useActionState(deleteProject, {
    error: "",
    message: "",
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog?.open) dialog?.showModal();
    cancel.current?.focus({ preventScroll: true });
    if (dialog) dialog.scrollTop = 0;
  }, []);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  return (
    <dialog
      ref={ref}
      className="project-delete-dialog"
      aria-labelledby={title}
      aria-describedby={description}
      onClose={close}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <header className="project-delete-heading">
        <span className="project-delete-icon">
          <Trash2 size={24} aria-hidden="true" />
        </span>
        <h2 id={title}>Excluir projeto?</h2>
        <p id={description}>
          Esta ação é definitiva. Confira o que será removido antes de
          continuar.
        </p>
      </header>
      <div className="project-delete-body">
        <div className="project-delete-scope">
          <span className="muted">Projeto selecionado</span>
          <strong>{name}</strong>
          <p>Serão excluídos:</p>
          <ul>
            <li>Refeições, registros de água e atividades</li>
            <li>Peso, medidas corporais, sono e fotos privadas</li>
            <li>Metas e versões do plano alimentar</li>
          </ul>
        </div>
        <p className="project-delete-preserved">
          Sua conta, biblioteca de alimentos e outros projetos serão
          preservados.
        </p>
        {active && (
          <p className="project-delete-active">
            Este é seu projeto ativo. Depois da exclusão, ative outro projeto
            para registrar dados ou importar atividades da Garmin.
          </p>
        )}
        <form
          id={formId}
          action={action}
          onSubmit={(event) => {
            if (!navigator.onLine || pending) event.preventDefault();
          }}
          className="data-form"
        >
          <fieldset disabled={pending || !online}>
            <input type="hidden" name="id" value={id} />
            <label>
              Digite o nome do projeto para confirmar
              <input name="name" required maxLength={100} autoComplete="off" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="confirm" required />
              Entendo que todos os dados vinculados serão excluídos.
            </label>
          </fieldset>
          {state.error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">
              {state.error}
            </p>
          )}
          {!online && (
            <p role="status">Sem conexão. A exclusão está bloqueada.</p>
          )}
        </form>
      </div>
      <div className="project-delete-actions">
        <button
          className="button-primary"
          type="submit"
          form={formId}
          disabled={pending || !online}
        >
          {pending ? "Excluindo…" : "Excluir definitivamente"}
        </button>
        <button
          ref={cancel}
          type="button"
          disabled={pending}
          className="button-secondary"
          onClick={() => ref.current?.close()}
        >
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
