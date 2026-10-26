import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
import { parseDietPages } from "../../src/lib/diet-plan.ts";
import {
  mealFoods,
  changedPortion,
  registrationItems,
  newMealFood,
  mealComposition,
} from "../../src/lib/meal-registration.ts";
import { randomUUID } from "node:crypto";
test("porções registradas escalam snapshots sem modificar o plano e preservam ausente versus zero", () => {
  const plan = parseDietPages([
    "Refeição 1\nArroz branco    125g\nPeito de frango    150g\nObservações:",
  ]);
  const original = JSON.stringify(plan),
    foods = mealFoods(plan.meals[0]);
  const items = registrationItems([
    changedPortion(foods[0], 100),
    changedPortion(foods[1], 75),
  ]);
  assert.equal(items[0].kcal, 128);
  assert.equal(items[1].kcal, 119.25);
  assert.equal(JSON.stringify(plan), original);
  const missing = newMealFood();
  missing.name = "Sem composição";
  missing.amount = 100;
  missing.values.kcal = 0;
  assert.equal(registrationItems([missing])[0].kcal, 0);
  assert.equal(registrationItems([missing])[0].protein, null);
  assert.throws(() => registrationItems([{ ...missing, amount: 0 }]));
  const skipped = changedPortion(foods[1], 0);
  assert.equal(mealComposition(skipped).kcal, 0);
  const partial = registrationItems([changedPortion(foods[0], 100), skipped]);
  assert.equal(partial.length, 1);
  assert.equal(partial[0].kcal, 128);
  assert.equal(
    changedPortion(skipped, foods[1].amount).amount,
    foods[1].amount,
  );
  assert.equal(
    mealComposition(changedPortion(skipped, foods[1].amount)).kcal,
    mealComposition(foods[1]).kcal,
  );
  for (const amount of [null, -1, Infinity, NaN, 100001])
    assert.throws(() => registrationItems([{ ...missing, amount }, foods[0]]));
  assert.equal(JSON.stringify(plan), original);
});
test("registro de refeição é atômico, idempotente, isolado e resolve apenas ACTIVE", async () => {
  const alice = "88888888-8888-4888-8888-888888888888",
    bob = "99999999-9999-4999-8999-999999999999";
  const db = await createDatabase([alice, bob]);
  const user = async (id) =>
    db.exec(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  const date = (
    await db.query(
      "select (now() at time zone 'America/Sao_Paulo')::date::text d",
    )
  ).rows[0].d;
  const plan = parseDietPages([
    "Refeição 1\nArroz branco    125g\nPeito de frango    150g\nObservações:",
  ]);
  const create = async () =>
    (
      await db.query("select create_project('Refeições',$1,null,2000) id", [
        date,
      ])
    ).rows[0].id;
  const save = async (project) =>
    (
      await db.query(
        "insert into diet_plans(project_id,title,document) values($1,$2,$3) returning id",
        [project, plan.title, JSON.stringify(plan)],
      )
    ).rows[0].id;
  const items = registrationItems(mealFoods(plan.meals[0]));
  const register = async (id, items, planId = null) =>
    db.query("select register_meal($1,$2,$3,$4,$5,$6) n", [
      id,
      date,
      "breakfast",
      JSON.stringify(items),
      planId,
      planId ? 0 : null,
    ]);
  try {
    await user(bob);
    const bp = await create(),
      bplan = await save(bp);
    await user(alice);
    const ap = await create(),
      aplan = await save(ap);
    assert.equal(
      (await db.query("select count(*)::int n from meal_items")).rows[0].n,
      0,
      "importar não registra consumo",
    );
    await assert.rejects(() => register(randomUUID(), items, bplan));
    await assert.rejects(() =>
      register(randomUUID(), [items[0], { ...items[1], amount: 0 }], aplan),
    );
    assert.equal(
      (await db.query("select count(*)::int n from meal_items")).rows[0].n,
      0,
      "reverte lote parcial",
    );
    const request = randomUUID();
    assert.equal((await register(request, items, aplan)).rows[0].n, 2);
    assert.equal((await register(request, items, aplan)).rows[0].n, 2);
    await assert.rejects(() =>
      register(request, [{ ...items[0], amount: 100 }], aplan),
    );
    await assert.rejects(() => register(randomUUID(), items, aplan));
    assert.equal(
      (await db.query("select count(*)::int n from meal_items")).rows[0].n,
      2,
    );
    const rows = (await db.query("select * from meal_items")).rows;
    assert.ok(
      rows.every(
        (r) =>
          r.project_id === ap && r.plan_id === aplan && r.plan_meal_index === 0,
      ),
    );
    await assert.rejects(() =>
      db.query(
        "update meal_items set plan_id=null,plan_meal_index=null where id=$1",
        [rows[0].id],
      ),
    );
    await user(bob);
    assert.equal(
      (await db.query("select count(*)::int n from meal_items")).rows[0].n,
      0,
    );
    await user(alice);
    await db.query("update projects set status='COMPLETED' where id=$1", [ap]);
    await assert.rejects(() => register(randomUUID(), items));
    const next = await create();
    await assert.rejects(() => register(randomUUID(), items, aplan));
    assert.equal((await register(randomUUID(), items)).rows[0].n, 2);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from meal_items where project_id=$1",
          [next],
        )
      ).rows[0].n,
      2,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(() => register(randomUUID(), items));
  } finally {
    await db.close();
  }
});
