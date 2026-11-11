import { ActionForm } from "@/components/forms/action-form";
import { eatingContexts } from "@/lib/daily-followup";
import { categories } from "@/lib/records";
import { saveEatingContext } from "@/app/painel/acompanhamento/actions";
export function EatingContextForm({
  date,
  min,
  max,
}: {
  date: string;
  min: string;
  max: string;
}) {
  return (
    <ActionForm
      action={saveEatingContext}
      submit="Registrar contexto"
      resetOnSuccess
      feedbackMode="modal"
    >
      <input type="hidden" name="request_id" value={crypto.randomUUID()} />
      <label>
        Data do contexto
        <input
          name="logged_on"
          type="date"
          required
          min={min}
          max={max}
          defaultValue={date}
        />
      </label>
      <label>
        Como quero registrar este momento?
        <select name="context" defaultValue="routine">
          {Object.entries(eatingContexts).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Refeição (opcional)
        <select name="category" defaultValue="">
          <option value="">Sem categoria</option>
          {Object.entries(categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <details className="daily-reflection">
        <summary>Fome, saciedade e contexto (opcional)</summary>
        <p className="field-hint">
          0 indica nenhuma fome ou saciedade; 10 indica muita. Em branco
          significa não informado.
        </p>
        <div className="form-grid">
          <label>
            Fome antes (0–10)
            <input
              name="hunger"
              type="number"
              min="0"
              max="10"
              step="1"
              inputMode="numeric"
            />
          </label>
          <label>
            Saciedade depois (0–10)
            <input
              name="satiety"
              type="number"
              min="0"
              max="10"
              step="1"
              inputMode="numeric"
            />
          </label>
        </div>
        <label>
          O que pode ter influenciado? (opcional)
          <input
            name="triggers"
            maxLength={300}
            placeholder="Ex.: cansaço, estresse, companhia, intervalo entre refeições"
          />
        </label>
        <label>
          O que gostaria de anotar? (opcional)
          <textarea name="notes" maxLength={500} rows={3} />
        </label>
      </details>
      <p className="field-hint">
        Este contexto não altera suas calorias, refeições ou metas. Não é
        necessário estimar quantidades para registrá-lo.
      </p>
    </ActionForm>
  );
}
