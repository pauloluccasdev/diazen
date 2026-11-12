import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { applyHydrationReference } from "@/app/painel/planos/actions";
import { WorkoutUnlinkForm } from "./workout-unlink-form";
import { WorkoutRecordForm } from "./workout-record-form";
import {
  validatePhasePlan,
  weekdayLabels,
  type PhasePlan,
  type WaterPlan,
  type StrengthPlan,
} from "@/lib/phase-plans";
import { formatDate, number, today } from "@/lib/domain";
import type { Entry } from "@/lib/records";
export function PhasePlanView({
  plan,
  editable,
  date,
  min,
  max,
  activities,
  links,
}: {
  plan: PhasePlan;
  editable: boolean;
  date: string;
  min: string;
  max: string;
  activities: Entry[];
  links: {
    id: string;
    activity_id: string;
    workout_id: string;
    logged_on: string;
    rpe: number | null;
  }[];
}) {
  const doc = validatePhasePlan(plan.kind, plan.document);
  const valid =
      plan.effective_from <= date &&
      (!plan.valid_until || date <= plan.valid_until),
    canRecord = editable && valid && date <= today();
  const linked = new Set(links.map((row) => row.activity_id));
  return (
    <section
      className="content-card saved-phase-plan"
      aria-label={
        plan.kind === "hydration"
          ? "Plano de hidratação"
          : "Fichas de musculação"
      }
    >
      <p className="eyebrow">
        {plan.kind === "hydration" ? "Hidratação" : "Musculação"} · Versão salva
      </p>
      <h2>{plan.title}</h2>
      <p className="muted">
        Vigência: {formatDate(plan.effective_from)}
        {plan.valid_until ? ` a ${formatDate(plan.valid_until)}` : " em diante"}
      </p>
      {plan.phase_name && <p>Fase: {plan.phase_name}</p>}
      {!valid && (
        <p className="readonly-note">
          Esta versão não está vigente na data consultada. O histórico permanece
          disponível.
        </p>
      )}
      {plan.reference_image_id && (
        <a
          className="button-secondary"
          href={`/api/planos/referencias/${plan.reference_image_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir referência visual privada
        </a>
      )}
      {plan.kind === "hydration" ? (
        <>
          {(() => {
            const water = doc as WaterPlan;
            return (
              <>
                <p className="metric-value">
                  {number(water.min_ml / 1000, 2)}–
                  {number(water.max_ml / 1000, 2)} L/dia
                </p>
                <p>
                  Referência cadastrada por você. O consumo continua sendo a
                  soma dos lançamentos.
                </p>
                {water.schedule.length > 0 && (
                  <>
                    <h3>Distribuição sugerida no plano</h3>
                    <ul className="water-plan-slots">
                      {water.schedule.map((slot, i) => (
                        <li key={i}>
                          <strong>{slot.time || slot.label}</strong>
                          <span>
                            {slot.time ? slot.label : ""} ·{" "}
                            {number(slot.min_ml, 0)}–{number(slot.max_ml, 0)} ml
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="field-hint">
                      Horários de referência, sem notificações automáticas.
                    </p>
                  </>
                )}
                {water.alternatives.length > 0 && (
                  <>
                    <h3>Alternativas informadas</h3>
                    <ul>
                      {water.alternatives.map((row, i) => (
                        <li key={i}>
                          {row.label}: {number(row.min_ml, 0)}–
                          {number(row.max_ml, 0)} ml/dia
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {canRecord && date === today() && (
                  <details>
                    <summary>Usar uma referência deste plano</summary>
                    <p>
                      Escolha um valor dentro das faixas cadastradas. A
                      confirmação muda a meta de água a partir de hoje e
                      permanece até uma nova alteração; não é um ajuste
                      automático por treino. Dias anteriores são preservados.
                    </p>
                    <ActionForm
                      action={applyHydrationReference}
                      submit="Confirmar referência de água"
                      feedbackMode="modal"
                    >
                      <input name="plan_id" type="hidden" value={plan.id} />
                      <label>
                        Referência escolhida (ml)
                        <input
                          name="target_ml"
                          type="number"
                          required
                          min="100"
                          max="15000"
                          step="1"
                          inputMode="numeric"
                        />
                      </label>
                      <label className="checkbox-label">
                        <input name="confirm" type="checkbox" required />
                        Confirmo alterar a meta vigente a partir de hoje.
                      </label>
                    </ActionForm>
                  </details>
                )}
              </>
            );
          })()}
        </>
      ) : (
        <>
          {(doc as StrengthPlan).workouts.map((workout) => (
            <details key={workout.id} className="workout-sheet" open>
              <summary>{workout.label}</summary>
              {workout.weekdays.length > 0 && (
                <p className="muted">
                  {workout.weekdays
                    .map((day) => weekdayLabels[day])
                    .join(" · ")}
                </p>
              )}
              <ol className="workout-exercise-list">
                {workout.exercises.map((ex) => (
                  <li key={ex.id}>
                    <strong>{ex.name}</strong>
                    <span>
                      {ex.sets} séries · {ex.reps_min}–{ex.reps_max} repetições
                      {ex.rest_seconds === null
                        ? ""
                        : ` · ${ex.rest_seconds} s de descanso`}
                    </span>
                    {ex.notes && <p>{ex.notes}</p>}
                  </li>
                ))}
              </ol>
              {workout.notes && <p>{workout.notes}</p>}
              {links
                .filter((row) => row.workout_id === workout.id)
                .map((row) => (
                  <div className="readonly-note" key={row.activity_id}>
                    Execução vinculada em {formatDate(row.logged_on)}
                    {row.rpe === null ? "" : ` · RPE ${number(row.rpe)}`} ·{" "}
                    <Link
                      href={`/painel/atividades?projeto=${plan.project_id}&data=${row.logged_on}#registros-do-dia`}
                    >
                      Ver atividade
                    </Link>
                  </div>
                ))}
              {editable && (
                <WorkoutUnlinkForm
                  links={links.filter((row) => row.workout_id === workout.id)}
                />
              )}
              {canRecord && (
                <details>
                  <summary>Registrar execução desta ficha</summary>
                  <WorkoutRecordForm
                    plan={plan.id}
                    workout={workout.id}
                    date={date}
                    min={min}
                    max={max}
                    existing={activities.filter(
                      (row) =>
                        !linked.has(row.id) &&
                        ["strength", "other"].includes(row.modality ?? ""),
                    )}
                    request={crypto.randomUUID()}
                  />
                </details>
              )}
            </details>
          ))}
        </>
      )}
      {doc.notes && (
        <div className="daily-note">
          <h3>Orientações cadastradas</h3>
          <p>{doc.notes}</p>
        </div>
      )}
      {editable && (
        <Link
          className="button-secondary"
          href={`/painel/planos/novo?tipo=${plan.kind}&base=${plan.id}`}
        >
          Criar nova versão a partir desta
        </Link>
      )}
    </section>
  );
}
