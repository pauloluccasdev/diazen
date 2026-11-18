import type { WaterGoal } from "./domain";
import type { Entry } from "./records";
import { shiftDay } from "./dashboard-metrics.ts";

export function hydrationWeek(
  rows: Pick<Entry, "logged_on" | "volume_ml">[],
  date: string,
  goals: Pick<WaterGoal, "effective_from" | "target_ml">[],
) {
  const versions = [...goals].sort((a, b) =>
    b.effective_from.localeCompare(a.effective_from),
  );
  return Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(date, index - 6);
    const entries = rows.filter((row) => row.logged_on === day);
    return {
      date: day,
      consumed: entries.length
        ? entries.reduce((total, row) => total + Number(row.volume_ml), 0)
        : null,
      count: entries.length,
      goal:
        versions.find((goal) => goal.effective_from <= day)?.target_ml ?? null,
    };
  });
}
export type HydrationDay = ReturnType<typeof hydrationWeek>[number];
