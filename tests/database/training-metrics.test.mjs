import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trainingTotals,
  trainingMetrics,
  trainingDuration,
} from "../../src/lib/training-metrics.ts";
const activity = (day, modality, duration, kcal = null, distance = null) => ({
  logged_on: day,
  modality,
  duration_min: duration,
  kcal,
  distance_km: distance,
});
test("treinos: calorias ausentes, zero conhecido, subtotal e distância apenas corrida/bike", () => {
  const rows = [
    activity("2026-11-17", "strength", 60, 0),
    activity("2026-11-17", "running", 30, null, 5),
    activity("2026-11-17", "swimming", 20, 100, 1),
  ];
  assert.deepEqual(trainingTotals(rows), {
    count: 3,
    duration: 110,
    calories: 100,
    missingCalories: 1,
    distance: 5,
    missingDistance: 0,
    distanceCount: 1,
  });
  assert.deepEqual(trainingTotals([]), {
    count: 0,
    duration: null,
    calories: null,
    missingCalories: 0,
    distance: null,
    missingDistance: 0,
    distanceCount: 0,
  });
  assert.equal(trainingTotals([rows[0]]).calories, 0);
  assert.equal(
    trainingTotals([activity("2026-11-17", "cycling", 30)]).distance,
    null,
  );
  assert.equal(
    trainingTotals([activity("2026-11-17", "cycling", 30, null, 0)]).distance,
    0,
  );
});
test("comparativo respeita o mesmo intervalo transcorrido e separa registro do dia", () => {
  const rows = [
    activity("2026-11-16", "strength", 60),
    activity("2026-11-17", "running", 30, 100, 5),
    activity("2026-11-09", "cycling", 40, 200, 10),
    activity("2026-11-10", "strength", 50),
    activity("2026-11-11", "strength", 60),
  ];
  const result = trainingMetrics(rows, "2026-11-17", "2026-11-17");
  assert.equal(result.current.count, 2);
  assert.equal(result.previous.count, 2);
  assert.equal(result.daily.count, 1);
  assert.equal(result.distribution.find((m) => m.key === "strength").count, 1);
  assert.deepEqual(
    result.days.map((d) => d.count),
    [1, 1, 0, 0, 0, 0, 0],
  );
  assert.equal(result.days[2].future, true);
  assert.equal(result.days[1].future, false);
});
test("semana histórica usa sete dias completos e mais de mil sessões", () => {
  const rows = Array.from({ length: 1005 }, () =>
    activity("2026-11-15", "other", 1, 0),
  );
  const result = trainingMetrics(rows, "2026-11-15", "2026-11-17");
  assert.equal(result.current.count, 1005);
  assert.equal(result.current.duration, 1005);
  assert.equal(result.current.calories, 0);
  assert.equal(result.previous.count, 0);
  assert.equal(result.days[6].count, 1005);
  assert.equal(
    result.days.some((d) => d.future),
    false,
  );
});
test("duração humana não transforma segundos registrados em zero minutos", () => {
  assert.equal(trainingDuration(null), "—");
  assert.equal(trainingDuration(0.5), "30 s");
  assert.equal(trainingDuration(45), "45 min");
  assert.equal(trainingDuration(70), "1 h 10 min");
});
