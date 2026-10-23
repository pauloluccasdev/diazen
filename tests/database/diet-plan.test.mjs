import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDietPages,
  planTotals,
  validatePlan,
} from "../../src/lib/diet-plan.ts";
import { createDatabase } from "../fixtures/database.mjs";
const pages = [
  `Refeição 1
Pão francês    1 Unidade(s) (50g)
Café *opcional    1 Xícara (100ml)
• Opcões de substituição para Pão francês:
Arroz - 125g - ou - Mandioca - 80g
Observações: Não são alimentos extras.`,
  `Refeição 1 - Opção 2
Banana    À vontade
Observações:`,
  `Pré-treino (longo ou intervalado)
Mel    20g
Observações:`,
];
test("plano preserva opções, substituições, porções e ausências sem somar variantes", () => {
  const p = parseDietPages(pages);
  assert.equal(p.meals.length, 3);
  assert.deepEqual(
    p.meals.map((m) => m.enabled),
    [true, false, false],
  );
  assert.equal(p.meals[0].groups[0].choices.length, 3);
  assert.equal(p.meals[0].groups[0].choices[0].amount, 50);
  assert.equal(p.meals[0].groups[1].choices[0].unit, "ml");
  assert.equal(p.meals[0].groups[1].included, false);
  assert.equal(p.meals[1].groups[0].choices[0].amount, null);
  assert.equal(planTotals(p.meals).kcal.value, null);
  const f = p.meals[0].groups[0].choices[0];
  f.tacoId = 53;
  f.values.kcal = 9999;
  const canonical = validatePlan(p);
  assert.equal(canonical.meals[0].groups[0].choices[0].values.kcal, null);
  assert.equal(planTotals(canonical.meals).kcal.value, 150);
  f.unit = "ml";
  assert.equal(planTotals(p.meals).kcal.value, null);
  p.meals[1].enabled = true;
  assert.throws(() => validatePlan(p));
});
test("tabela numérica usa valores por porção, mantém alternativas e não duplica suplementos", () => {
  const p = parseDietPages([
    `Café da Manhã • 08:30
Pão    50 g    150    5    25    3
ou Tapioca    40 g    100    0    25    0
TOTAL    150    5    25    3`,
    `Almoço • 13:00
Frango    150 g    240    45    0    4
Suplementação
Whey    30 g    120    20    2    1`,
  ]);
  assert.equal(p.meals.length, 2);
  assert.equal(p.meals[0].groups.length, 1);
  assert.equal(planTotals(p.meals).kcal.value, 390);
  assert.equal(planTotals(p.meals).carbs.value, 25);
  p.meals[0].groups[0].selected = 1;
  assert.equal(planTotals(p.meals).kcal.value, 340);
  assert.throws(() => parseDietPages(["Documento sem tabela"]));
});
test("planos têm isolamento, versões imutáveis, planejamento DRAFT e bloqueio de encerrados", async () => {
  const alice = "66666666-6666-4666-8666-666666666666",
    bob = "77777777-7777-4777-8777-777777777777";
  const db = await createDatabase([alice, bob]);
  const user = async (id) =>
    db.exec(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  try {
    await user(alice);
    const project = (
      await db.query(
        "select create_project('Plano',(now() at time zone 'America/Sao_Paulo')::date,null,2000) as id",
      )
    ).rows[0].id;
    const doc = JSON.stringify(validatePlan(parseDietPages(pages)));
    const insert = () =>
      db.query(
        "insert into diet_plans(project_id,title,document) values($1,'Meu plano',$2) returning id",
        [project, doc],
      );
    const id = (await insert()).rows[0].id;
    await assert.rejects(() =>
      db.query("update diet_plans set title='Outro' where id=$1", [id]),
    );
    await user(bob);
    assert.equal((await db.query("select * from diet_plans")).rows.length, 0);
    await assert.rejects(insert);
    await user(alice);
    await db.query("update projects set status='COMPLETED' where id=$1", [
      project,
    ]);
    await assert.rejects(insert);
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [alice]);
    assert.equal((await db.query("select * from diet_plans")).rows.length, 0);
  } finally {
    await db.close();
  }
});
