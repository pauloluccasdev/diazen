"use client";
import { useState, useEffect } from "react";
import { ActionForm, useFormFeedback } from "@/components/forms/action-form";
import { recordPlannedWorkout } from "@/app/painel/planos/actions";
import type { Entry } from "@/lib/records";
function ResetChoice({ reset }: { reset: (value: string) => void }) {
  const state = useFormFeedback();
  useEffect(() => {
    if (state.message && !state.error) reset("");
  }, [state, reset]);
  return null;
}
export function WorkoutRecordForm({
  plan,
  workout,
  date,
  min,
  max,
  existing,
  request,
}: {
  plan: string;
  workout: string;
  date: string;
  min: string;
  max: string;
  existing: Entry[];
  request: string;
}) {
  const [selected, setSelected] = useState("");
  const activity = existing.find((row) => row.id === selected);
  return (
    <ActionForm
      action={recordPlannedWorkout}
      submit="Confirmar execução"
      feedbackMode="modal"
      resetOnSuccess
    >
      <ResetChoice reset={setSelected} />
      <input name="plan_id" type="hidden" value={plan} />
      <input name="workout_id" type="hidden" value={workout} />
      <input name="request_id" type="hidden" value={request} />
      <label>
        Data realizada
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
        Como registrar a sessão?
        <select
          name="existing"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Criar atividade de musculação</option>
          {existing.map((row) => (
            <option key={row.id} value={row.id}>
              {row.external_provider === "garmin" ? "Garmin · " : ""}
              {row.name || "Atividade"} · {row.duration_min} min
            </option>
          ))}
        </select>
      </label>
      <p className="field-hint">
        As atividades listadas são as 50 mais recentes da data consultada.
        Escolha uma já importada para vincular a ficha sem criar outra sessão. O
        vínculo preserva os dados originais.
      </p>
      {activity ? (
        <>
          <input
            name="duration_min"
            type="hidden"
            value={activity.duration_min}
          />
          <p>Duração da atividade preservada: {activity.duration_min} min</p>
        </>
      ) : (
        <label>
          Duração realizada (minutos)
          <input
            name="duration_min"
            type="number"
            required
            min="0.01"
            max="1440"
            step="0.01"
            inputMode="decimal"
          />
        </label>
      )}
      <label>
        Esforço percebido — RPE (0–10, opcional)
        <input
          name="rpe"
          type="number"
          min="0"
          max="10"
          step="0.5"
          inputMode="decimal"
        />
      </label>
      <label>
        Observações da execução (opcional)
        <textarea name="notes" maxLength={500} rows={2} />
      </label>
    </ActionForm>
  );
}
