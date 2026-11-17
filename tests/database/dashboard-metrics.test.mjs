import { test } from "node:test";
import assert from "node:assert/strict";
import {
  caloriesByDate,
  macroDistribution,
  shiftDay,
  periodStart,
} from "../../src/lib/dashboard-metrics.ts";

test("comparativo conserva dias ausentes, zero conhecido e subtotal parcial sem misturar datas", () => {
  const rows = [
    { logged_on: "2026-11-16", kcal: 128, amount: 50, reference_amount: 100 },
    { logged_on: "2026-11-16", kcal: null, amount: 20, reference_amount: 100 },
    { logged_on: "2026-11-17", kcal: 0, amount: 150, reference_amount: 100 },
    { logged_on: "2026-11-18", kcal: null, amount: 100, reference_amount: 100 },
  ];
  const totals = caloriesByDate(rows);
  assert.deepEqual(totals["2026-11-16"], { value: 64, missing: 1, count: 2 });
  assert.deepEqual(totals["2026-11-17"], { value: 0, missing: 0, count: 1 });
  assert.deepEqual(totals["2026-11-18"], { value: null, missing: 1, count: 1 });
  assert.equal(totals["2026-11-15"], undefined);
});
test("donut representa energia, não percentuais de gramas, e recusa composição parcial", () => {
  const values = {
    protein: 100,
    carbs: 100,
    fat: 100,
    missing_protein: 0,
    missing_carbs: 0,
    missing_fat: 0,
  };
  const shares = macroDistribution(values);
  assert.equal(Math.round(shares[2]), 53);
  assert.equal(Math.round(shares[0]), 24);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 100) < 1e-10);
  assert.equal(macroDistribution({ ...values, missing_fat: 1 }), null);
  assert.equal(macroDistribution({ ...values, protein: null }), null);
  assert.equal(
    macroDistribution({ ...values, protein: 0, carbs: 0, fat: 0 }),
    null,
  );
});
test("períodos são dias corridos incluindo data final, respeitam ano bissexto e início explícito", () => {
  assert.equal(shiftDay("2028-03-01", -1), "2028-02-29");
  assert.equal(periodStart("2026-11-17", "7", "2026-01-01"), "2026-11-11");
  assert.equal(
    periodStart("2026-11-17", "project", "2026-01-01"),
    "2026-01-01",
  );
});
