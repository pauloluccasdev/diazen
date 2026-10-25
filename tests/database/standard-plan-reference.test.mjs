import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDietPages,
  foodComposition,
  planTotals,
  analyzeDietPlan,
  validatePlan,
} from "../../src/lib/diet-plan.ts";

test("referências aproximadas preenchem alimentos comuns com preparo identificado, sem internet", () => {
  const plan = parseDietPages([
    `Refeição 1
Arroz branco    125g
Peito de frango    150g
Feijão    100g
Semente de chia    5g
Psyllium    10g
Requeijão light    20g
Salada de verduras e legumes *no mínimo 150g    À vontade
Alface, tomate, cebola, picles, etc.    À vontade
Observações:`,
  ]);
  const foods = plan.meals[0].groups.map((g) => g.choices[0]);
  assert.equal(planTotals(plan.meals).kcal.missing, 0);
  assert.equal(foodComposition(foods[0]).kcal, 160);
  assert.equal(foodComposition(foods[1]).kcal, 238.5);
  assert.match(foods[0].source, /tipo 1, cozido/);
  assert.match(foods[1].source, /sem pele, grelhado/);
  assert.equal(foodComposition(foods[3]).kcal, 22.1);
  assert.equal(foods[6].amount, 150);
  assert.equal(foods[7].amount, 100);
  assert.match(foods[7].source, /porção estimada/);
  assert.deepEqual(validatePlan(plan), plan);
  foods[0].values.kcal = 175;
  assert.equal(
    analyzeDietPlan(plan).meals[0].groups[0].choices[0].values.kcal,
    175,
  );
});
test("aproximação preserva preparo explícito, unidade incompatível e alimento desconhecido", () => {
  const plan = parseDietPages([
    `Refeição 1
Arroz branco cru    100g
Arroz branco    100ml
Alimento inexistente    100g
Observações:`,
  ]);
  for (const g of plan.meals[0].groups)
    assert.equal(foodComposition(g.choices[0]).kcal, null);
});
