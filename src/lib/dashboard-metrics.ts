import type { Entry } from "./records.ts";

export function shiftDay(date: string, days: number) {
  const cursor = new Date(`${date}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}
export function periodStart(
  date: string,
  period: string,
  projectStart: string,
) {
  return period === "project"
    ? projectStart
    : shiftDay(date, -(Number(period) - 1));
}
export function caloriesByDate(
  rows: Pick<Entry, "logged_on" | "kcal" | "amount" | "reference_amount">[],
) {
  const totals: Record<
    string,
    { value: number | null; missing: number; count: number }
  > = {};
  for (const row of rows) {
    const total = totals[row.logged_on] ?? {
      value: null,
      missing: 0,
      count: 0,
    };
    total.count++;
    if (row.kcal == null) total.missing++;
    else
      total.value =
        (total.value ?? 0) +
        (Number(row.kcal) * Number(row.amount)) / Number(row.reference_amount);
    totals[row.logged_on] = total;
  }
  return totals;
}
export function macroDistribution(values: {
  protein: number | string | null;
  carbs: number | string | null;
  fat: number | string | null;
  missing_protein: number;
  missing_carbs: number;
  missing_fat: number;
}) {
  const fields = ["protein", "carbs", "fat"] as const;
  if (
    fields.some(
      (key) => values[key] === null || Number(values[`missing_${key}`]) > 0,
    )
  )
    return null;
  const energy = fields.map(
    (key, index) => Number(values[key]) * (index === 2 ? 9 : 4),
  );
  const total = energy.reduce((sum, item) => sum + item, 0);
  return total > 0 ? energy.map((item) => (item / total) * 100) : null;
}
