import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evolutionMetrics,
  evolutionPeriod,
  evolutionWindow,
  weightReference,
} from "../../src/lib/evolution-metrics.ts";
const project = {
  starts_on: "2026-01-01",
  weight_mode: "target",
  weight_min: 88,
  weight_max: null,
};
const weight = (id, date, kg) => ({ id, logged_on: date, kg });
test("evolução usa dias de calendário e valida período, sem confundir 30 medições com 30 dias", () => {
  assert.equal(evolutionPeriod("31"), "30");
  assert.equal(evolutionPeriod("project"), "project");
  assert.deepEqual(evolutionWindow(project, "2026-11-18", "7"), {
    start: "2026-11-12",
    end: "2026-11-18",
  });
  const metrics = evolutionMetrics(
    [
      weight("old", "2026-10-01", 96),
      weight("new", "2026-11-17", 94),
      weight("future", "2026-11-19", 93),
    ],
    project,
    "2026-11-18",
    "30",
  );
  assert.deepEqual(
    metrics.weights.map((r) => r.id),
    ["new"],
  );
  assert.equal(metrics.previous.id, "old");
  assert.equal(metrics.difference, -2);
  assert.equal(metrics.latest.logged_on, "2026-11-17");
  assert.ok(Math.abs(metrics.percentage - (-2 / 96) * 100) < 1e-12);
});
test("alvo e faixa são referências opcionais e diferença não presume perda como objetivo", () => {
  assert.equal(weightReference({ ...project, weight_mode: "track" }, 94), null);
  assert.equal(weightReference({ ...project, weight_mode: "none" }, 94), null);
  assert.equal(weightReference(project, 94).difference, 6);
  assert.equal(weightReference(project, 84).difference, -4);
  assert.equal(weightReference(project, null).difference, null);
  const range = {
    ...project,
    weight_mode: "range",
    weight_min: 88,
    weight_max: 92,
  };
  assert.equal(weightReference(range, 90).difference, 0);
  assert.equal(weightReference(range, 94).difference, 2);
  assert.equal(weightReference(range, 85).difference, -3);
});
test("sem peso não há zero, percentual ou progresso presumidos", () => {
  const metrics = evolutionMetrics([], project, "2026-11-18", "30");
  assert.equal(metrics.latest, null);
  assert.equal(metrics.previous, null);
  assert.equal(metrics.difference, null);
  assert.equal(metrics.percentage, null);
  assert.equal(metrics.reference.difference, null);
  assert.deepEqual(metrics.weights, []);
  assert.equal(metrics.measurements.length, 10);
  assert.ok(
    metrics.measurements.every(
      (m) => m.latest === null && m.difference === null,
    ),
  );
});
test("medidas comparam o mesmo tipo e datas reais, sem completar tipos ausentes", () => {
  const rows = [
    {
      id: "a",
      logged_on: "2026-11-17",
      measurement_type: "waist",
      value_cm: "90.00",
    },
    {
      id: "b",
      logged_on: "2026-11-01",
      measurement_type: "waist",
      value_cm: "92.00",
    },
    {
      id: "c",
      logged_on: "2026-11-18",
      measurement_type: "chest",
      value_cm: "110.00",
    },
  ];
  const result = evolutionMetrics(rows, project, "2026-11-18", "7");
  const waist = result.measurements.find((m) => m.key === "waist");
  assert.equal(waist.difference, -2);
  assert.deepEqual(
    waist.rows.map((r) => r.id),
    ["a"],
  );
  assert.equal(
    result.measurements.find((m) => m.key === "chest").difference,
    null,
  );
  assert.equal(result.measurements.find((m) => m.key === "hips").latest, null);
  assert.equal(result.latest, null);
});
test("histórico integral não limita indicadores à primeira página nem inclui futuro", () => {
  const rows = Array.from({ length: 1005 }, (_, i) =>
    weight(
      String(i),
      new Date(Date.parse("2026-11-17T12:00:00Z") - i * 86400000)
        .toISOString()
        .slice(0, 10),
      94,
    ),
  );
  const result = evolutionMetrics(
    rows,
    { ...project, starts_on: "2020-01-01" },
    "2026-11-18",
    "project",
  );
  assert.equal(result.weights.length, 1005);
  assert.equal(result.entries.length, 1005);
  assert.equal(
    evolutionWindow({ ...project, starts_on: "2026-11-15" }, "2026-11-18", "90")
      .start,
    "2026-11-15",
  );
});
