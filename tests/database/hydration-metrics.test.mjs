import { test } from "node:test";
import assert from "node:assert/strict";
import { hydrationWeek } from "../../src/lib/hydration-metrics.ts";
test("hidratação semanal mantém ausências e vigência histórica das metas", () => {
  const days = hydrationWeek(
    [
      { logged_on: "2026-11-16", volume_ml: 250 },
      { logged_on: "2026-11-16", volume_ml: 750 },
      { logged_on: "2026-11-17", volume_ml: 500 },
    ],
    "2026-11-17",
    [
      { effective_from: "2026-11-17", target_ml: 3000 },
      { effective_from: "2026-11-12", target_ml: 2000 },
    ],
  );
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], {
    date: "2026-11-11",
    consumed: null,
    count: 0,
    goal: null,
  });
  assert.deepEqual(days[1], {
    date: "2026-11-12",
    consumed: null,
    count: 0,
    goal: 2000,
  });
  assert.deepEqual(days[5], {
    date: "2026-11-16",
    consumed: 1000,
    count: 2,
    goal: 2000,
  });
  assert.deepEqual(days[6], {
    date: "2026-11-17",
    consumed: 500,
    count: 1,
    goal: 3000,
  });
});
test("hidratação soma mais de mil lançamentos sem confundir datas", () => {
  const rows = Array.from({ length: 1005 }, () => ({
    logged_on: "2026-11-17",
    volume_ml: 10,
  }));
  rows.push({ logged_on: "2026-11-10", volume_ml: 500 });
  const days = hydrationWeek(rows, "2026-11-17", []);
  assert.equal(days[6].consumed, 10050);
  assert.equal(days[6].count, 1005);
  assert.equal(days[6].goal, null);
  assert.equal(days[0].consumed, null);
});
