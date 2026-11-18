"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Ellipsis, Plus, X } from "lucide-react";
import { RecordFeedbackDialog } from "@/components/record-feedback-dialog";
import {
  ActionForm,
  type FormAction,
  type FormResult,
} from "@/components/forms/action-form";

const ProjectFeedback = createContext<((result: FormResult) => void) | null>(
  null,
);

export function ProjectFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FormResult | null>(null);
  return (
    <ProjectFeedback.Provider value={setFeedback}>
      {children}
      {feedback && (feedback.message || feedback.error) && (
        <RecordFeedbackDialog
          message={feedback.error || feedback.message}
          error={Boolean(feedback.error)}
          onClose={() => setFeedback(null)}
        />
      )}
    </ProjectFeedback.Provider>
  );
}

export function ProjectDialogButton({
  target,
  children,
  icon = "plus",
  className = "button-primary",
  ariaLabel,
}: {
  target: string;
  children?: ReactNode;
  icon?: "plus" | "more";
  className?: string;
  ariaLabel?: string;
}) {
  const Icon = icon === "more" ? Ellipsis : Plus;
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-controls={target}
      onClick={() => {
        const dialog = document.getElementById(target);
        if (dialog instanceof HTMLDialogElement && !dialog.open) {
          dialog.showModal();
          dialog.scrollTop = 0;
          dialog
            .querySelector<HTMLButtonElement>(".dz-project-dialog-close")
            ?.focus({ preventScroll: true });
        }
      }}
    >
      <Icon size={20} aria-hidden="true" />
      {children}
    </button>
  );
}

export function ProjectDialog({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    titleId = useId();
  return (
    <>
      <dialog
        id={id}
        ref={dialog}
        className="dz-project-dialog"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            className="dz-project-dialog-close button-secondary"
            type="button"
            aria-label="Fechar gerenciamento"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="dz-project-dialog-body">{children}</div>
      </dialog>
    </>
  );
}

export function ProjectActionForm({
  action,
  submit,
  children,
  resetOnSuccess = false,
  className,
}: {
  action: FormAction;
  submit: string;
  children: ReactNode;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const notify = useContext(ProjectFeedback);
  if (!notify)
    throw Error("Formulário de projeto fora do contexto de feedback.");
  return (
    <div ref={root}>
      <ActionForm
        action={async (state, form) => {
          const result = await action(state, form);
          if (result.message && !result.error)
            root.current
              ?.closest<HTMLDialogElement>("dialog.dz-project-dialog")
              ?.close();
          notify(result);
          return result;
        }}
        submit={submit}
        resetOnSuccess={resetOnSuccess}
        className={className}
        feedbackMode="external"
      >
        {children}
      </ActionForm>
    </div>
  );
}

export function ProjectRemovalFeedback({ pending }: { pending: boolean }) {
  const [visible, setVisible] = useState(true);
  return visible ? (
    <RecordFeedbackDialog
      message={`Projeto excluído. Seus registros vinculados foram removidos.${pending ? " A limpeza dos arquivos privados está pendente de nova tentativa; eles já não aparecem na galeria." : ""}`}
      onClose={() => setVisible(false)}
    />
  ) : null;
}
