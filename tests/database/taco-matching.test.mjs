import test from "node:test";
import assert from "node:assert/strict";
import { matchTacoFood, suggestTacoFoods } from "../../src/lib/taco.ts";
import {
  parseDietPages,
  analyzeDietPlan,
  applyPlanReference,
  planTotals,
  foodComposition,
} from "../../src/lib/diet-plan.ts";
test("identificação automática respeita nomes equivalentes, light e preparo ambíguo", () => {
  assert.equal(matchTacoFood("Pão francês").id, 53);
  assert.equal(matchTacoFood("Queijo muçarela").id, 463);
  assert.equal(matchTacoFood("Queijo mussarela").id, 463);
  assert.equal(matchTacoFood("Mel de abelha").id, 507);
  assert.equal(matchTacoFood("Arroz, tipo 1, cozido").id, 3);
  for (const name of [
    "Feijão",
    "Peito de frango",
    "Arroz branco",
    "Mamão",
    "Banana",
    "Requeijão light",
    "Queijo muçarela light",
    "Psyllium",
    "Semente de chia",
    "Pão de forma",
  ])
    assert.equal(matchTacoFood(name), null, name);
  assert.ok(suggestTacoFoods("Peito de frango").length > 1);
  assert.equal(suggestTacoFoods("Requeijão light").length, 0);
});
test("importação preenche fonte e porções, preserva PDF e confirma referências repetidas", () => {
  const p = parseDietPages([
    `Refeição 1
Pão francês    50g
Queijo muçarela    40g
Peito de frango    100g
Requeijão light    20g
Observações:`,
    `Refeição 2
Peito de frango    150g
Observações:`,
  ]);
  assert.equal(p.meals[0].groups[0].choices[0].tacoId, 53);
  assert.equal(foodComposition(p.meals[0].groups[0].choices[0]).kcal, 150);
  assert.match(p.meals[0].groups[1].choices[0].source, /item 463/);
  assert.equal(planTotals(p.meals).kcal.missing, 0);
  const confirmed = applyPlanReference(p, "Peito de frango", 408);
  assert.match(
    confirmed.meals[1].groups[0].choices[0].source,
    /padrão.*grelhado/,
  );
  assert.equal(planTotals(confirmed.meals).kcal.missing, 0);
  assert.equal(p.meals[1].groups[0].choices[0].tacoId, null, "edição imutável");
  const manual = parseDietPages([
    `Café • 08:00
Pão francês    50 g    123    4    20    2`,
  ]);
  assert.equal(manual.meals[0].groups[0].choices[0].tacoId, null);
  assert.equal(planTotals(analyzeDietPlan(manual).meals).kcal.value, 123);
});
