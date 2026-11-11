import { ActionForm } from "@/components/forms/action-form";
import { savePhase } from "@/app/painel/acompanhamento/actions";
import { today } from "@/lib/domain";
import type { ProjectPhase } from "@/lib/daily-followup";
export function PhaseForm({
  initial,
  min,
  max,
}: {
  initial?: ProjectPhase;
  min: string;
  max: string | null;
}) {
  const suggest =
    !initial &&
    min <= "2026-11-10" &&
    (!max || max >= "2026-12-31") &&
    today() <= "2026-12-31";
  return (
    <ActionForm
      action={savePhase}
      submit={initial ? "Salvar ajustes da fase" : "Criar fase"}
      feedbackMode="modal"
      resetOnSuccess={!initial}
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label>
        Nome da fase
        <input
          name="name"
          maxLength={100}
          required
          defaultValue={initial?.name ?? (suggest ? "Consistência e Base" : "")}
        />
      </label>
      <div className="form-grid">
        <label>
          Início da fase
          <input
            name="starts_on"
            type="date"
            required
            min={min}
            max={max ?? undefined}
            defaultValue={
              initial?.starts_on ?? (suggest ? "2026-11-10" : today())
            }
          />
        </label>
        <label>
          Fim da fase
          <input
            name="ends_on"
            type="date"
            required
            min={min}
            max={max ?? undefined}
            defaultValue={initial?.ends_on ?? (suggest ? "2026-12-31" : "")}
          />
        </label>
      </div>
      <label>
        Objetivo desta fase
        <textarea
          name="objective"
          required
          maxLength={500}
          rows={3}
          defaultValue={initial?.objective ?? ""}
        />
      </label>
      <label>
        Próximo marco (opcional)
        <input
          name="milestone"
          maxLength={120}
          defaultValue={initial?.milestone ?? ""}
        />
      </label>
      <label>
        Data do marco (preencha junto ao título)
        <input
          name="milestone_on"
          type="date"
          min={min}
          max={max ?? undefined}
          defaultValue={initial?.milestone_on ?? ""}
        />
      </label>
      <p className="field-hint">
        Fases pertencem a este projeto e não podem se sobrepor. Nenhuma meta
        física ou nutricional é definida automaticamente.
      </p>
    </ActionForm>
  );
}
