import { test } from "node:test";
import assert from "node:assert/strict";
import { groupFoodDay } from "../../src/lib/food-day.ts";

test("seis refeições distinguem vazio, zero conhecido, subtotal e porção proporcional", () => {
  const groups = groupFoodDay([
    {
      category: "breakfast",
      amount: 50,
      reference_amount: 100,
      kcal: 200,
      protein: 10,
      carbs: null,
      fat: 0,
    },
    {
      category: "breakfast",
      amount: 25,
      reference_amount: 100,
      kcal: null,
      protein: 20,
      carbs: 0,
      fat: 0,
    },
    {
      category: "lunch",
      amount: 100,
      reference_amount: 100,
      kcal: 0,
      protein: null,
      carbs: null,
      fat: null,
    },
  ]);
  assert.equal(groups.length, 6);
  assert.deepEqual(groups[0].totals.kcal, { value: 100, missing: 1 });
  assert.deepEqual(groups[0].totals.protein, { value: 10, missing: 0 });
  assert.deepEqual(groups[0].totals.carbs, { value: 0, missing: 1 });
  assert.deepEqual(groups[0].totals.fat, { value: 0, missing: 0 });
  assert.deepEqual(groups[1].totals.kcal, { value: null, missing: 0 });
  assert.deepEqual(groups[2].totals.kcal, { value: 0, missing: 0 });
  assert.equal(groups[2].items.length, 1);
});

test("agregação de dia completo não trunca em 20 ou 1000 itens", () => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({
    category: index < 1001 ? "lunch" : "dinner",
    amount: 50,
    reference_amount: 100,
    kcal: 2,
    protein: 0,
    carbs: null,
    fat: null,
  }));
  const groups = groupFoodDay(rows);
  assert.equal(groups[2].items.length, 1001);
  assert.deepEqual(groups[2].totals.kcal, { value: 1001, missing: 0 });
  assert.deepEqual(groups[4].totals.kcal, { value: 4, missing: 0 });
});
