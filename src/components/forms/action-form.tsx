"use client";
import {
  useActionState,
  useEffect,
  useRef,
  startTransition,
  createContext,
  useContext,
} from "react";
import { useOnline } from "@/lib/use-online";
export type FormResult = {
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
};
const FormFeedback = createContext<FormResult>({ error: "", message: "" });
export function useFormFeedback() {
  return useContext(FormFeedback);
}
export type FormAction = (
  state: FormResult,
  form: FormData,
) => Promise<FormResult>;
export function ActionForm({
  action,
  children,
  submit = "Salvar",
  className = "data-form",
  resetOnSuccess = false,
  disclosureTitle,
  initiallyOpen = true,
}: {
  action: FormAction;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  resetOnSuccess?: boolean;
  disclosureTitle?: string;
  initiallyOpen?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(
    async (previous: FormResult & { resetVersion: number }, form: FormData) => {
      const next = await action(previous, form);
      return {
        ...next,
        resetVersion:
          previous.resetVersion +
          (resetOnSuccess && next.message && !next.error ? 1 : 0),
      };
    },
    { error: "", message: "", resetVersion: 0 },
  );
  const online = useOnline();
  const feedback = useRef<HTMLParagraphElement>(null);
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (state.error) feedback.current?.focus();
    else if (state.message && resetOnSuccess && disclosure.current) {
      disclosure.current.open = false;
      disclosure.current.querySelector("summary")?.focus();
    }
  }, [state, resetOnSuccess]);
  const fields = (
    <fieldset key={state.resetVersion} disabled={pending || !online}>
      {children}
      <button type="submit" className="button-primary">
        {pending ? "Salvando…" : submit}
      </button>
    </fieldset>
  );
  return (
    <form
      className={className}
      action={dispatch}
      onSubmit={(event) => {
        event.preventDefault();
        if (!navigator.onLine || pending) return;
        const form = new FormData(event.currentTarget);
        startTransition(() => dispatch(form));
      }}
    >
      <FormFeedback.Provider value={state}>
        {disclosureTitle ? (
          <details
            className="form-disclosure"
            ref={disclosure}
            open={initiallyOpen}
          >
            <summary>{disclosureTitle}</summary>
            {fields}
          </details>
        ) : (
          fields
        )}
      </FormFeedback.Provider>
      {state.error && (
        <p className="form-error" role="alert" tabIndex={-1} ref={feedback}>
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="form-success" role="status">
          {state.message}
        </p>
      )}
      {!online && (
        <p role="status">Sem conexão. As alterações estão bloqueadas.</p>
      )}
    </form>
  );
}
