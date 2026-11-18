import { modalities, weekBounds, type Entry } from "./records.ts";
import { shiftDay } from "./dashboard-metrics.ts";

export function trainingTotals(rows: Entry[]) {
  const knownCalories = rows.filter((row) => row.kcal != null);
  const distanceRows = rows.filter((row) =>
    ["running", "cycling"].includes(row.modality ?? ""),
  );
  const knownDistance = distanceRows.filter((row) => row.distance_km != null);
  return {
    count: rows.length,
    duration: rows.length
      ? rows.reduce((sum, row) => sum + Number(row.duration_min), 0)
      : null,
    calories: knownCalories.length
      ? knownCalories.reduce((sum, row) => sum + Number(row.kcal), 0)
      : null,
    missingCalories: rows.length - knownCalories.length,
    distance: knownDistance.length
      ? knownDistance.reduce((sum, row) => sum + Number(row.distance_km), 0)
      : null,
    missingDistance: distanceRows.length - knownDistance.length,
    distanceCount: distanceRows.length,
  };
}

export function trainingMetrics(rows: Entry[], date: string, today: string) {
  const week = weekBounds(date);
  const until = week.end < today ? week.end : today;
  const current = rows.filter(
    (row) => row.logged_on >= week.start && row.logged_on <= until,
  );
  const previous = rows.filter(
    (row) =>
      row.logged_on >= shiftDay(week.start, -7) &&
      row.logged_on <= shiftDay(until, -7),
  );
  return {
    week,
    until,
    daily: trainingTotals(rows.filter((row) => row.logged_on === date)),
    current: trainingTotals(current),
    previous: trainingTotals(previous),
    distribution: Object.entries(modalities).map(([key, label]) => ({
      key: key as keyof typeof modalities,
      label,
      ...trainingTotals(current.filter((row) => row.modality === key)),
    })),
    days: Array.from({ length: 7 }, (_, index) => {
      const day = shiftDay(week.start, index);
      return {
        date: day,
        count: current.filter((row) => row.logged_on === day).length,
        future: day > today,
      };
    }),
  };
}
export type TrainingMetrics = ReturnType<typeof trainingMetrics>;

export function trainingDuration(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes > 0 && minutes < 1)
    return `${Math.max(1, Math.round(minutes * 60))} s`;
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  return hours
    ? `${hours} h ${String(total % 60).padStart(2, "0")} min`
    : `${total} min`;
}
