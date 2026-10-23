import test from "node:test";
import assert from "node:assert/strict";
import {
  tacoFoods,
  tacoMetadata,
  searchTacoFoods,
  tacoPortion,
  tacoSource,
} from "../../src/lib/taco.ts";

test("TACO preserva 597 IDs, referência por 100g e estados não numéricos", () => {
  assert.equal(tacoFoods.length, 597);
  assert.deepEqual(
    tacoFoods.map((food) => food.id),
    Array.from({ length: 597 }, (_, i) => i + 1),
  );
  assert.equal(tacoMetadata.year, 2011);
  assert.match(tacoMetadata.license, /citada a fonte/);
  for (const food of tacoFoods) {
    assert.equal(food.reference_amount, 100);
    assert.equal(food.unit, "g");
    assert.ok(food.name.length <= 120);
    assert.ok(food.printed_page >= 26 && food.printed_page <= 64);
    for (const field of ["kcal", "protein", "carbs", "fat"]) {
      if (food.markers[field]) assert.equal(food[field], null);
      else assert.ok(Number.isFinite(food[field]) && food[field] >= 0);
    }
  }
});
test("TACO busca sem acentos e mantém termos de preparo e light", () => {
  assert.ok(searchTacoFoods("pao frances").some((food) => food.id === 53));
  assert.deepEqual(
    searchTacoFoods("arroz tipo 1 cozido").map((food) => food.id),
    [3],
  );
  assert.ok(
    searchTacoFoods("frango peito cru").every((food) => /cru/.test(food.name)),
  );
  assert.deepEqual(searchTacoFoods("requeijao light"), []);
  assert.deepEqual(searchTacoFoods("psyllium"), []);
  assert.deepEqual(searchTacoFoods(""), []);
  assert.ok(searchTacoFoods("a", 1000).length === 0);
});
test("TACO calcula a porção preservando zero, traço e valores em reavaliação", () => {
  const rice = tacoFoods.find((food) => food.id === 3);
  assert.deepEqual(tacoPortion(rice, 125), {
    kcal: 160,
    protein: 3.125,
    carbs: 35.125,
    fat: 0.25,
  });
  const chicken = tacoFoods.find((food) => food.id === 408);
  assert.equal(tacoPortion(chicken, 150).carbs, 0);
  const trace = tacoFoods.find((food) => food.id === 42);
  assert.equal(trace.markers.fat, "trace");
  assert.equal(tacoPortion(trace, 100).fat, null);
  const unavailable = tacoFoods.find((food) => food.id === 450);
  assert.equal(unavailable.markers.kcal, "under_review");
  assert.equal(tacoPortion(unavailable, 100).kcal, null);
  assert.match(tacoSource(rice), /item 3, p\. 26/);
  for (const grams of [0, -1, NaN, Infinity, 100001])
    assert.throws(() => tacoPortion(rice, grams), RangeError);
});
