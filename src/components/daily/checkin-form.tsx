import { ActionForm } from "@/components/forms/action-form";
import {
  checkinScales,
  reflectionFields,
  type DailyCheckin,
} from "@/lib/daily-followup";
import { saveCheckin } from "@/app/painel/acompanhamento/actions";
export function CheckinForm({
  date,
  min,
  max,
  initial,
}: {
  date: string;
  min: string;
  max: string;
  initial: DailyCheckin | null;
}) {
  return (
    <ActionForm
      action={saveCheckin}
      submit="Salvar check-in"
      feedbackMode="modal"
      fieldsKey={initial?.id ?? "new"}
    >
      <label>
        Data do check-in
        <input
          name="logged_on"
          type="date"
          required
          min={min}
          max={max}
          defaultValue={date}
        />
      </label>
      <p className="field-hint">
        Preencha apenas o que fizer sentido. Você pode completar depois. Estas
        percepções não calculam se você está apto a treinar.
      </p>
      <label>
        Horas de sono (opcional, informado por você)
        <input
          name="sleep_hours"
          type="number"
          inputMode="decimal"
          min="0"
          max="24"
          step="0.25"
          defaultValue={initial?.sleep_hours ?? ""}
        />
      </label>
      <div className="form-grid">
        {Object.entries(checkinScales).map(([key, scale]) => (
          <label key={key}>
            {scale.label}
            <select
              name={key}
              defaultValue={initial?.[key as keyof typeof checkinScales] ?? ""}
            >
              <option value="">Não informado</option>
              {scale.options.map((label, i) => (
                <option value={i} key={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <details className="daily-reflection">
        <summary>Refletir sobre o dia (opcional)</summary>
        {Object.entries(reflectionFields).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              name={key}
              rows={2}
              maxLength={500}
              defaultValue={
                initial?.[key as keyof typeof reflectionFields] ?? ""
              }
            />
          </label>
        ))}
      </details>
    </ActionForm>
  );
}
