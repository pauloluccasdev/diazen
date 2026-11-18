import type { Project } from "./domain.ts";
import type { Entry } from "./records.ts";
import { measurements } from "./records.ts";
import { shiftDay } from "./dashboard-metrics.ts";

export const evolutionPeriods = ["7", "30", "90", "project"] as const;
export type EvolutionPeriod = (typeof evolutionPeriods)[number];
export function evolutionPeriod(value: string | undefined): EvolutionPeriod {
  return evolutionPeriods.includes(value as EvolutionPeriod)
    ? (value as EvolutionPeriod)
    : "30";
}
export function evolutionWindow(
  project: Project,
  date: string,
  period: EvolutionPeriod,
) {
  const candidate =
    period === "project"
      ? project.starts_on
      : shiftDay(date, 1 - Number(period));
  return {
    start: candidate < project.starts_on ? project.starts_on : candidate,
    end: date,
  };
}
export function weightReference(project: Project, current: number | null) {
  if (
    !["target", "range"].includes(project.weight_mode) ||
    project.weight_min == null
  )
    return null;
  const min = Number(project.weight_min);
  const max =
    project.weight_mode === "range" && project.weight_max != null
      ? Number(project.weight_max)
      : min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return {
    min,
    max,
    mode: project.weight_mode as "target" | "range",
    difference:
      current === null
        ? null
        : current < min
          ? current - min
          : current > max
            ? current - max
            : 0,
  };
}
export function evolutionMetrics(
  rows: Entry[],
  project: Project,
  date: string,
  period: EvolutionPeriod,
) {
  const window = evolutionWindow(project, date, period);
  const ordered = rows
    .filter((row) => row.logged_on <= date)
    .toSorted(
      (a, b) =>
        b.logged_on.localeCompare(a.logged_on) || a.id.localeCompare(b.id),
    );
  const weights = ordered.filter((row) => row.kg != null);
  const latest = weights[0] ?? null;
  const previous = weights[1] ?? null;
  const difference =
    latest && previous ? Number(latest.kg) - Number(previous.kg) : null;
  return {
    window,
    allEntries: ordered,
    latest,
    previous,
    difference,
    percentage:
      difference !== null && Number(previous!.kg) > 0
        ? (difference / Number(previous!.kg)) * 100
        : null,
    reference: weightReference(project, latest ? Number(latest.kg) : null),
    weights: weights.filter((row) => row.logged_on >= window.start),
    measurements: Object.entries(measurements).map(([key, label]) => {
      const values = ordered.filter(
        (row) => row.measurement_type === key && row.value_cm != null,
      );
      return {
        key,
        label,
        latest: values[0] ?? null,
        previous: values[1] ?? null,
        difference:
          values.length > 1
            ? Number(values[0].value_cm) - Number(values[1].value_cm)
            : null,
        rows: values.filter((row) => row.logged_on >= window.start),
      };
    }),
    entries: ordered.filter((row) => row.logged_on >= window.start),
  };
}
export type EvolutionMetrics = ReturnType<typeof evolutionMetrics>;
