import test from "node:test";
import assert from "node:assert/strict";
import {
  onlineFoodReference,
  onlineFoodSource,
} from "../../src/lib/online-food.ts";
import {
  parseDietPages,
  applyOnlinePlanReference,
  planTotals,
  validatePlan,
} from "../../src/lib/diet-plan.ts";
const product = {
  code: "1234567890123",
  product_name: "Creme light fictício",
  brands: "Marca fictícia",
  nutrition: {
    input_sets: [
      {
        source: "packaging",
        preparation: "as_sold",
        per: "100g",
        per_quantity: 100,
        per_unit: "g",
        nutrients: { "energy-kcal": { value: 999, unit: "kcal" } },
      },
      {
        source: "packaging",
        preparation: "as_sold",
        per: "serving",
        per_quantity: 30,
        per_unit: "g",
        nutrients: {
          "energy-kcal": { value: 60, unit: "kcal" },
          proteins: { value: 3, unit: "g" },
          carbohydrates: { value: 0, unit: "g" },
          fat: { value: 4, unit: "g" },
        },
      },
    ],
  },
};
test("fonte online usa um rótulo completo, preserva zeros e não mistura registros", () => {
  const r = onlineFoodReference(product);
  assert.equal(r.amount, 30);
  assert.equal(r.values.kcal, 60);
  assert.equal(r.values.carbs, 0);
  assert.match(onlineFoodSource(r), /Open Food Facts/);
  const incomplete = structuredClone(product);
  delete incomplete.nutrition.input_sets[1].nutrients.fat;
  assert.equal(onlineFoodReference(incomplete).values.fat, null);
  const estimate = structuredClone(product);
  estimate.nutrition.input_sets.forEach((s) => (s.source = "estimate"));
  assert.equal(onlineFoodReference(estimate), null);
});
test("referência padrão calcula porções repetidas sem trocar ml por g ou alterar fontes revisadas", () => {
  const p = parseDietPages([
    `Refeição 1
Creme light fictício    20g
Creme light fictício    40g
Creme light fictício    100ml
Observações:`,
  ]);
  const r = onlineFoodReference(product),
    food = p.meals[0].groups[0].choices[0];
  const next = applyOnlinePlanReference(p, food, r);
  assert.equal(next.meals[0].groups[0].choices[0].values.kcal, 40);
  assert.equal(next.meals[0].groups[1].choices[0].values.kcal, 80);
  assert.equal(next.meals[0].groups[2].choices[0].values.kcal, null);
  assert.equal(planTotals(next.meals).kcal.value, 120);
  assert.equal(planTotals(next.meals).kcal.missing, 1);
  assert.ok(validatePlan(next));
  assert.equal(food.values.kcal, null);
});
