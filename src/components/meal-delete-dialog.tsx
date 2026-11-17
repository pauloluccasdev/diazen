"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMealGroup } from "@/app/painel/[modulo]/actions";
import { categories } from "@/lib/records";
import { formatDate } from "@/lib/domain";
import { useOnline } from "@/lib/use-online";
type Props = {
  project: string;
  date: string;
  category: keyof typeof categories;
};
export function MealDeleteDialog(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button-secondary project-delete-trigger meal-delete-trigger"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={18} aria-hidden="true" />
        Excluir refeição inteira
      </button>
      {open && <Confirmation {...props} close={() => setOpen(false)} />}
    </>
  );
}
function Confirmation({
  project,
  date,
  category,
  close,
}: Props & { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    error = useRef<HTMLParagraphElement>(null);
  const title = useId(),
    description = useId(),
    formId = useId();
  const [state, action, pending] = useActionState(deleteMealGroup, {
    error: "",
    message: "",
  });
  const online = useOnline();
  useEffect(() => {
    dialog.current?.showModal();
    cancel.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (state.error) error.current?.focus();
  }, [state]);
  return (
    <dialog
      ref={dialog}
      className="project-delete-dialog"
      aria-labelledby={title}
      aria-describedby={description}
      onClose={close}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
    >
      <header className="project-delete-heading">
        <span className="project-delete-icon">
          <Trash2 size={24} aria-hidden="true" />
        </span>
        <h2 id={title}>Excluir refeição inteira?</h2>
        <p id={description}>
          Todos os alimentos desta refeição na data abaixo serão removidos do
          diário. Essa ação não pode ser desfeita pelo aplicativo.
        </p>
      </header>
      <div className="project-delete-body">
        <div className="project-delete-scope">
          <strong>{categories[category]}</strong>
          <span>{formatDate(date)}</span>
          <p>
            A exclusão inclui os alimentos que estejam em outras páginas da
            listagem.
          </p>
        </div>
        <p className="project-delete-preserved">
          Seu plano alimentar e os registros das outras refeições e datas serão
          preservados.
        </p>
        <form
          id={formId}
          action={action}
          className="data-form"
          onSubmit={(e) => {
            if (pending || !navigator.onLine) e.preventDefault();
          }}
        >
          <fieldset disabled={pending || !online}>
            <input type="hidden" name="project" value={project} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="category" value={category} />
            <label className="checkbox-label">
              <input type="checkbox" name="confirm" required />
              Confirmo a exclusão de todos os alimentos desta refeição.
            </label>
          </fieldset>
          {state.error && (
            <p ref={error} role="alert" tabIndex={-1} className="form-error">
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
          type="submit"
          form={formId}
          className="button-primary"
          disabled={pending || !online}
        >
          {pending ? "Excluindo…" : "Excluir todos os alimentos"}
        </button>
        <button
          type="button"
          ref={cancel}
          className="button-secondary"
          disabled={pending}
          onClick={() => dialog.current?.close()}
        >
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
