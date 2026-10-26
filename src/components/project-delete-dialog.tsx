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
    description = useId();
  const online = useOnline();
  const [state, action, pending] = useActionState(deleteProject, {
    error: "",
    message: "",
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog?.open) dialog?.showModal();
    cancel.current?.focus();
  }, []);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);
  return (
    <dialog
      ref={ref}
      className="plan-saved-dialog project-delete-dialog"
      aria-labelledby={title}
      aria-describedby={description}
      onClose={close}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <h2 id={title}>Excluir projeto?</h2>
      <div id={description}>
        <p>
          Você vai excluir definitivamente <strong>{name}</strong> e todos os
          dados vinculados a ele:
        </p>
        <ul>
          <li>Refeições, registros de água e atividades;</li>
          <li>Peso, medidas corporais e fotos privadas;</li>
          <li>Metas e versões do plano alimentar.</li>
        </ul>
        <p>
          Essa ação não pode ser desfeita pelo aplicativo. Sua conta, biblioteca
          de alimentos e outros projetos serão preservados.
        </p>
        {active && (
          <p>
            Ao excluir o projeto ativo, os novos registros e a importação Garmin
            precisarão de outro projeto ativo.
          </p>
        )}
      </div>
      <form
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
          <button className="button-primary" type="submit">
            {pending ? "Excluindo…" : "Excluir definitivamente"}
          </button>
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
      <button
        ref={cancel}
        type="button"
        disabled={pending}
        className="button-secondary"
        onClick={() => ref.current?.close()}
      >
        Cancelar
      </button>
    </dialog>
  );
}
