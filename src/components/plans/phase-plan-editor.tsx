"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useOnline } from "@/lib/use-online";
import { RecordFeedbackDialog } from "@/components/record-feedback-dialog";
import { PlanReferences } from "./plan-references";
import { savePhasePlan } from "@/app/painel/planos/actions";
import {
  weekdayLabels,
  validatePhasePlan,
  type PhasePlan,
  type PlanKind,
  type PlanAsset,
  type WaterPlan,
  type StrengthPlan,
  type Workout,
  type PlannedExercise,
} from "@/lib/phase-plans";
import type { ProjectPhase } from "@/lib/daily-followup";
function Numeric({
  label,
  value,
  onChange,
  min,
  max,
  optional = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min: number;
  max: number;
  optional?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        required={!optional}
        min={min}
        max={max}
        step="1"
        value={value === null || (value === 0 && min > 0) ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
}
export function PhasePlanEditor({
  kind,
  initial,
  draft,
  phases,
  assets,
  min,
  max,
  date,
}: {
  kind: PlanKind;
  initial: PhasePlan | null;
  draft: WaterPlan | StrengthPlan;
  phases: ProjectPhase[];
  assets: PlanAsset[];
  min: string;
  max: string | null;
  date: string;
}) {
  const [document, setDocument] = useState<WaterPlan | StrengthPlan>(
      initial?.document ?? draft,
    ),
    [title, setTitle] = useState(initial?.title ?? ""),
    [effective, setEffective] = useState(date),
    [phase, setPhase] = useState(initial?.phase_id ?? ""),
    [image, setImage] = useState(initial?.reference_image_id ?? ""),
    [reviewed, setReviewed] = useState(false),
    [request, setRequest] = useState(""),
    [saved, setSaved] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  const [pending, startTransition] = useTransition(),
    online = useOnline(),
    disabled = pending || !online;
  function edited() {
    setReviewed(false);
    setSaved(false);
    setRequest("");
  }
  function update(next: WaterPlan | StrengthPlan) {
    setDocument(next);
    edited();
  }
  const water = document as WaterPlan,
    strength = document as StrengthPlan;
  function changeWorkout(index: number, patch: Partial<Workout>) {
    update({
      ...strength,
      workouts: strength.workouts.map((w, i) =>
        i === index ? { ...w, ...patch } : w,
      ),
    });
  }
  return (
    <form
      className="data-form phase-plan-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled || !reviewed || saved) return;
        setMessage("");
        setError(false);
        try {
          const canonical = validatePhasePlan(kind, document),
            id = request || crypto.randomUUID();
          setRequest(id);
          startTransition(async () => {
            try {
              const result = await savePhasePlan({
                id,
                kind,
                title,
                effective_from: effective,
                phase_id: phase || null,
                reference_image_id: image || null,
                document: canonical,
              });
              if (result.error) {
                setError(true);
                setMessage(result.error);
              } else {
                setSaved(true);
                setMessage(result.message!);
              }
            } catch {
              setError(true);
              setMessage(
                "Não foi possível confirmar. Consulte as versões antes de repetir.",
              );
            }
          });
        } catch (ex) {
          setError(true);
          setMessage(ex instanceof Error ? ex.message : "Confira o plano.");
        }
      }}
    >
      <fieldset disabled={disabled}>
        <label>
          Nome desta versão
          <input
            value={title}
            required
            maxLength={120}
            onChange={(e) => {
              setTitle(e.target.value);
              edited();
            }}
          />
        </label>
        <label>
          Início de vigência
          <input
            type="date"
            required
            min={min}
            max={max ?? undefined}
            value={effective}
            onChange={(e) => {
              setEffective(e.target.value);
              edited();
            }}
          />
        </label>
        <PlanReferences
          phases={phases}
          assets={assets}
          phase={phase}
          image={image}
          onPhase={(id) => {
            setPhase(id);
            edited();
          }}
          onImage={(id) => {
            setImage(id);
            edited();
          }}
          disabled={disabled}
        />
        {kind === "hydration" ? (
          <>
            <h2>Referência diária informada</h2>
            <div className="form-grid">
              <Numeric
                label="Mínimo de referência (ml)"
                value={water.min_ml}
                min={100}
                max={15000}
                onChange={(n) => update({ ...water, min_ml: n ?? 0 })}
              />
              <Numeric
                label="Máximo de referência (ml)"
                value={water.max_ml}
                min={100}
                max={15000}
                onChange={(n) => update({ ...water, max_ml: n ?? 0 })}
              />
            </div>
            <h3>Distribuição por horário (opcional)</h3>
            {water.schedule.map((slot, i) => (
              <div className="plan-editor-row" key={i}>
                <label>
                  Momento
                  <input
                    required
                    maxLength={80}
                    value={slot.label}
                    onChange={(e) =>
                      update({
                        ...water,
                        schedule: water.schedule.map((s, j) =>
                          j === i ? { ...s, label: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Horário (opcional)
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) =>
                      update({
                        ...water,
                        schedule: water.schedule.map((s, j) =>
                          j === i ? { ...s, time: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <div className="form-grid">
                  <Numeric
                    label="Volume mínimo (ml)"
                    min={100}
                    max={15000}
                    value={slot.min_ml}
                    onChange={(n) =>
                      update({
                        ...water,
                        schedule: water.schedule.map((s, j) =>
                          j === i ? { ...s, min_ml: n ?? 0 } : s,
                        ),
                      })
                    }
                  />
                  <Numeric
                    label="Volume máximo (ml)"
                    min={100}
                    max={15000}
                    value={slot.max_ml}
                    onChange={(n) =>
                      update({
                        ...water,
                        schedule: water.schedule.map((s, j) =>
                          j === i ? { ...s, max_ml: n ?? 0 } : s,
                        ),
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    update({
                      ...water,
                      schedule: water.schedule.filter((_, j) => j !== i),
                    })
                  }
                >
                  Retirar horário
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button-secondary"
              disabled={water.schedule.length >= 12}
              onClick={() =>
                update({
                  ...water,
                  schedule: [
                    ...water.schedule,
                    { label: "", time: "", min_ml: 0, max_ml: 0 },
                  ],
                })
              }
            >
              Adicionar horário
            </button>
            <h3>Alternativas por contexto (opcional)</h3>
            {water.alternatives.map((row, i) => (
              <div className="plan-editor-row" key={i}>
                <label>
                  Contexto informado
                  <input
                    required
                    maxLength={80}
                    value={row.label}
                    placeholder="Ex.: dia de descanso, treino ou calor"
                    onChange={(e) =>
                      update({
                        ...water,
                        alternatives: water.alternatives.map((s, j) =>
                          j === i ? { ...s, label: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <div className="form-grid">
                  <Numeric
                    label="Referência mínima (ml)"
                    min={100}
                    max={15000}
                    value={row.min_ml}
                    onChange={(n) =>
                      update({
                        ...water,
                        alternatives: water.alternatives.map((s, j) =>
                          j === i ? { ...s, min_ml: n ?? 0 } : s,
                        ),
                      })
                    }
                  />
                  <Numeric
                    label="Referência máxima (ml)"
                    min={100}
                    max={15000}
                    value={row.max_ml}
                    onChange={(n) =>
                      update({
                        ...water,
                        alternatives: water.alternatives.map((s, j) =>
                          j === i ? { ...s, max_ml: n ?? 0 } : s,
                        ),
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    update({
                      ...water,
                      alternatives: water.alternatives.filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                >
                  Retirar alternativa
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button-secondary"
              disabled={water.alternatives.length >= 8}
              onClick={() =>
                update({
                  ...water,
                  alternatives: [
                    ...water.alternatives,
                    { label: "", min_ml: 0, max_ml: 0 },
                  ],
                })
              }
            >
              Adicionar alternativa
            </button>
            <p className="field-hint">
              Horários e faixas são referências cadastradas por você. Salvar não
              lança consumo nem altera sua meta vigente.
            </p>
          </>
        ) : (
          <>
            <h2>Minhas fichas</h2>
            {strength.workouts.map((workout, wi) => (
              <section className="plan-editor-row" key={workout.id}>
                <label>
                  Nome da ficha
                  <input
                    required
                    maxLength={80}
                    value={workout.label}
                    onChange={(e) =>
                      changeWorkout(wi, { label: e.target.value })
                    }
                  />
                </label>
                <fieldset className="weekday-options">
                  <legend>Dias da semana (opcional)</legend>
                  {weekdayLabels.map((day, d) => (
                    <label className="checkbox-label" key={day}>
                      <input
                        type="checkbox"
                        checked={workout.weekdays.includes(d)}
                        onChange={(e) =>
                          changeWorkout(wi, {
                            weekdays: e.target.checked
                              ? [...workout.weekdays, d]
                              : workout.weekdays.filter((v) => v !== d),
                          })
                        }
                      />
                      {day}
                    </label>
                  ))}
                </fieldset>
                {workout.exercises.map((ex, ei) => {
                  const change = (patch: Partial<PlannedExercise>) =>
                    changeWorkout(wi, {
                      exercises: workout.exercises.map((v, i) =>
                        i === ei ? { ...v, ...patch } : v,
                      ),
                    });
                  return (
                    <div className="planned-exercise-editor" key={ex.id}>
                      <label>
                        Exercício
                        <input
                          required
                          maxLength={120}
                          value={ex.name}
                          onChange={(e) => change({ name: e.target.value })}
                        />
                      </label>
                      <div className="form-grid">
                        <Numeric
                          label="Séries planejadas"
                          value={ex.sets}
                          min={1}
                          max={20}
                          onChange={(n) => change({ sets: n ?? 0 })}
                        />
                        <Numeric
                          label="Repetições mínimas"
                          value={ex.reps_min}
                          min={1}
                          max={100}
                          onChange={(n) => change({ reps_min: n ?? 0 })}
                        />
                        <Numeric
                          label="Repetições máximas"
                          value={ex.reps_max}
                          min={1}
                          max={100}
                          onChange={(n) => change({ reps_max: n ?? 0 })}
                        />
                        <Numeric
                          label="Descanso (segundos, opcional)"
                          value={ex.rest_seconds}
                          min={0}
                          max={900}
                          optional
                          onChange={(n) => change({ rest_seconds: n })}
                        />
                      </div>
                      <label>
                        Observação do exercício
                        <input
                          maxLength={300}
                          value={ex.notes}
                          onChange={(e) => change({ notes: e.target.value })}
                        />
                      </label>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={workout.exercises.length <= 1}
                        onClick={() =>
                          changeWorkout(wi, {
                            exercises: workout.exercises.filter(
                              (_, i) => i !== ei,
                            ),
                          })
                        }
                      >
                        Retirar exercício
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="button-secondary"
                  disabled={workout.exercises.length >= 30}
                  onClick={() =>
                    changeWorkout(wi, {
                      exercises: [
                        ...workout.exercises,
                        {
                          id: crypto.randomUUID(),
                          name: "",
                          sets: 0,
                          reps_min: 0,
                          reps_max: 0,
                          rest_seconds: null,
                          notes: "",
                        },
                      ],
                    })
                  }
                >
                  Adicionar exercício
                </button>
                <label>
                  Observações da ficha
                  <textarea
                    maxLength={500}
                    value={workout.notes}
                    onChange={(e) =>
                      changeWorkout(wi, { notes: e.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={strength.workouts.length <= 1}
                  onClick={() =>
                    update({
                      ...strength,
                      workouts: strength.workouts.filter((_, i) => i !== wi),
                    })
                  }
                >
                  Retirar ficha
                </button>
              </section>
            ))}
            <button
              type="button"
              className="button-secondary"
              disabled={strength.workouts.length >= 10}
              onClick={() =>
                update({
                  ...strength,
                  workouts: [
                    ...strength.workouts,
                    {
                      id: crypto.randomUUID(),
                      label: "",
                      weekdays: [],
                      notes: "",
                      exercises: [
                        {
                          id: crypto.randomUUID(),
                          name: "",
                          sets: 0,
                          reps_min: 0,
                          reps_max: 0,
                          rest_seconds: null,
                          notes: "",
                        },
                      ],
                    },
                  ],
                })
              }
            >
              Adicionar ficha
            </button>
            <p className="field-hint">
              Informe o planejamento fornecido por você ou pelo profissional.
              Não são geradas progressões, cargas ou recomendações
              automaticamente.
            </p>
          </>
        )}
        <label>
          Orientações e observações (opcional)
          <textarea
            value={document.notes}
            maxLength={1000}
            rows={3}
            onChange={(e) => update({ ...document, notes: e.target.value })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          Conferi os dados e quero salvar uma versão, sem registrar execução ou
          consumo.
        </label>
        <button
          type="submit"
          className="button-primary"
          disabled={!reviewed || saved}
        >
          {pending
            ? "Salvando…"
            : saved
              ? "Versão salva"
              : "Salvar versão do plano"}
        </button>
      </fieldset>
      {saved && (
        <Link
          className="button-secondary"
          href={`/painel/planos?versao=${request}`}
        >
          Ver versão salva
        </Link>
      )}
      {message && (
        <RecordFeedbackDialog
          message={message}
          error={error}
          onClose={() => setMessage("")}
        />
      )}{" "}
      {!online && <p role="status">Sem conexão. Alterações bloqueadas.</p>}
    </form>
  );
}
