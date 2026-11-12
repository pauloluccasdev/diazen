import { isId } from "./domain.ts";
export type WaterSlot = {
  label: string;
  time: string;
  min_ml: number;
  max_ml: number;
};
export type WaterPlan = {
  version: 1;
  min_ml: number;
  max_ml: number;
  schedule: WaterSlot[];
  alternatives: { label: string; min_ml: number; max_ml: number }[];
  notes: string;
};
export type PlannedExercise = {
  id: string;
  name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number | null;
  notes: string;
};
export type Workout = {
  id: string;
  label: string;
  weekdays: number[];
  notes: string;
  exercises: PlannedExercise[];
};
export type StrengthPlan = { version: 1; workouts: Workout[]; notes: string };
export type PlanKind = "hydration" | "strength";
export type PlanAsset = { id: string; name: string; storage_key: string };
export type PhasePlan = {
  id: string;
  project_id: string;
  phase_id: string | null;
  reference_image_id: string | null;
  kind: PlanKind;
  title: string;
  effective_from: string;
  valid_until: string | null;
  phase_name: string | null;
  created_at: string;
  document: WaterPlan | StrengthPlan;
};
export const weekdayLabels = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Confira a estrutura do plano.");
  return v as Record<string, unknown>;
}
function text(v: unknown, max: number, required = false) {
  if (typeof v !== "string" || v.trim().length > max || (required && !v.trim()))
    throw Error("Confira os nomes e observações.");
  return v.trim();
}
function number(v: unknown, min: number, max: number) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw Error("Confira séries, repetições e volumes.");
  return v;
}
function array(v: unknown, max: number, min = 0) {
  if (!Array.isArray(v) || v.length > max || v.length < min)
    throw Error("Confira a quantidade de itens.");
  return v;
}
function range(row: Record<string, unknown>) {
  const min_ml = number(row.min_ml, 100, 15000),
    max_ml = number(row.max_ml, min_ml, 15000);
  return { min_ml, max_ml };
}
export function validatePhasePlan(
  kind: PlanKind,
  input: unknown,
): WaterPlan | StrengthPlan {
  const doc = object(input);
  if (doc.version !== 1 || JSON.stringify(doc).length > 100000)
    throw Error("Plano inválido.");
  const notes = text(doc.notes ?? "", 1000);
  if (kind === "hydration")
    return {
      version: 1,
      ...range(doc),
      notes,
      schedule: array(doc.schedule, 12).map((value) => {
        const row = object(value),
          time = text(row.time, 5);
        if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
          throw Error("Confira os horários.");
        return { label: text(row.label, 80, true), time, ...range(row) };
      }),
      alternatives: array(doc.alternatives, 8).map((value) => {
        const row = object(value);
        return { label: text(row.label, 80, true), ...range(row) };
      }),
    };
  if (kind !== "strength") throw Error("Tipo de plano inválido.");
  const ids = new Set<string>();
  const workouts = array(doc.workouts, 10, 1).map((value) => {
    const row = object(value),
      id = text(row.id, 36);
    if (!isId(id) || ids.has(id)) throw Error("Ficha inválida.");
    ids.add(id);
    const weekdays = array(row.weekdays, 7).map((v) => number(v, 0, 6));
    if (new Set(weekdays).size !== weekdays.length)
      throw Error("Dia repetido.");
    const exerciseIds = new Set<string>();
    const exercises = array(row.exercises, 30, 1).map((v) => {
      const ex = object(v),
        eid = text(ex.id, 36);
      if (!isId(eid) || exerciseIds.has(eid))
        throw Error("Exercício inválido.");
      exerciseIds.add(eid);
      const reps_min = number(ex.reps_min, 1, 100);
      return {
        id: eid,
        name: text(ex.name, 120, true),
        sets: number(ex.sets, 1, 20),
        reps_min,
        reps_max: number(ex.reps_max, reps_min, 100),
        rest_seconds:
          ex.rest_seconds == null ? null : number(ex.rest_seconds, 0, 900),
        notes: text(ex.notes ?? "", 300),
      };
    });
    return {
      id,
      label: text(row.label, 80, true),
      weekdays,
      notes: text(row.notes ?? "", 500),
      exercises,
    };
  });
  return { version: 1, workouts, notes };
}
