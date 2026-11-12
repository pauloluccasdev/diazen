"use client";
import { useActionState, useState, startTransition } from "react";
import { unlinkWorkout } from "@/app/painel/planos/actions";
import { RecordFeedbackDialog } from "@/components/record-feedback-dialog";
import { useOnline } from "@/lib/use-online";
export function WorkoutUnlinkForm({
  links,
}: {
  links: { id: string; activity_id: string }[];
}) {
  const [state, dispatch, pending] = useActionState(
    async (
      prior: { error: string; message: string; version: number },
      form: FormData,
    ) => ({
      ...(await unlinkWorkout(prior, form)),
      version: prior.version + 1,
    }),
    { error: "", message: "", version: 0 },
  );
  const [dismissed, setDismissed] = useState(0);
  const online = useOnline();
  return (
    <>
      {links.length > 0 && (
        <details>
          <summary>Desvincular ficha desta atividade</summary>
          <form
            className="data-form"
            action={dispatch}
            onSubmit={(e) => {
              e.preventDefault();
              if (!online || pending) return;
              const data = new FormData(e.currentTarget);
              startTransition(() => dispatch(data));
            }}
          >
            <fieldset disabled={!online || pending}>
              {links.length === 1 ? (
                <input type="hidden" name="id" value={links[0].id} />
              ) : (
                <label>
                  Vínculo a remover
                  <select name="id" key={links.map((l) => l.id).join()}>
                    {links.map((link, i) => (
                      <option key={link.id} value={link.id}>
                        Execução {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="checkbox-label">
                <input name="confirm" type="checkbox" required />
                Confirmo remover apenas o vínculo, mantendo a atividade.
              </label>
              <button className="button-secondary" type="submit">
                {pending ? "Removendo…" : "Remover vínculo"}
              </button>
            </fieldset>
            {!online && (
              <p role="status">Sem conexão. As alterações estão bloqueadas.</p>
            )}
          </form>
        </details>
      )}
      {state.version > dismissed && (state.error || state.message) && (
        <RecordFeedbackDialog
          error={Boolean(state.error)}
          message={state.error || state.message}
          onClose={() => setDismissed(state.version)}
        />
      )}
    </>
  );
}
