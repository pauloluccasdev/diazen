import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
const a = "00000000-0000-4000-8000-000000000031",
  b = "00000000-0000-4000-8000-000000000032";
const db = await createDatabase([a, b]);
after(() => db.close());
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const shift = (n) => {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
async function as(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function project(user, name) {
  await as(user);
  return (
    await db.query(
      "select public.create_project($1,$2,$3,$4,$5,$6,$7,$8) as id",
      [name, shift(-2), shift(90), 2000, "track", null, null, 4],
    )
  ).rows[0].id;
}
const pa = await project(a, "Ciclo A"),
  pb = await project(b, "Ciclo B");
test("preferências são da conta, isoladas, exportáveis e não alteram registros", async () => {
  await as(a);
  await db.query(
    "insert into display_preferences(show_weight,show_calories,show_photos) values(false,false,false)",
  );
  assert.equal(
    (await db.query("select * from display_preferences")).rows[0].show_calories,
    false,
  );
  await as(b);
  assert.equal(
    (await db.query("select * from display_preferences")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "update display_preferences set show_calories=true where user_id=$1 returning *",
        [a],
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query("insert into display_preferences(user_id) values($1)", [a]),
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(db.query("select * from display_preferences"));
});
test("fases resolvem ACTIVE, aceitam futuro e rejeitam sobreposição e datas externas", async () => {
  await as(a);
  const phase = (
    await db.query(
      "insert into project_phases(project_id,name,starts_on,ends_on,objective,milestone,milestone_on) values($1,$2,$3,$4,$5,$6,$7) returning *",
      [pb, "Base", day, shift(10), "Construir rotina", "Revisão", shift(5)],
    )
  ).rows[0];
  assert.equal(phase.project_id, pa);
  await assert.rejects(
    db.query(
      "insert into project_phases(project_id,name,starts_on,ends_on,objective) values($1,$2,$3,$4,$5)",
      [pa, "Sobreposta", shift(10), shift(12), "Objetivo"],
    ),
  );
  await db.query(
    "insert into project_phases(project_id,name,starts_on,ends_on,objective) values($1,$2,$3,$4,$5)",
    [pa, "Próxima", shift(11), shift(20), "Objetivo"],
  );
  await assert.rejects(
    db.query(
      "insert into project_phases(project_id,name,starts_on,ends_on,objective) values($1,$2,$3,$4,$5)",
      [pa, "Fora", shift(-10), shift(-5), "Objetivo"],
    ),
  );
  await assert.rejects(
    db.query("update project_phases set milestone_on=$1 where id=$2", [
      shift(30),
      phase.id,
    ]),
  );
  await as(b);
  assert.equal((await db.query("select * from project_phases")).rows.length, 0);
});
test("check-in parcial distingue zero e ausência, é único e não aceita vazio/futuro/forja", async () => {
  await as(a);
  const first = (
    await db.query("select save_daily_checkin($1,$2) as id", [
      day,
      JSON.stringify({ fatigue: 0 }),
    ])
  ).rows[0].id;
  let row = (await db.query("select * from daily_checkins")).rows[0];
  assert.equal(row.fatigue, 0);
  assert.equal(row.energy, null);
  assert.equal(row.project_id, pa);
  const second = (
    await db.query("select save_daily_checkin($1,$2) as id", [
      day,
      JSON.stringify({ fatigue: 2, worked: "Voltei a registrar" }),
    ])
  ).rows[0].id;
  assert.equal(first, second);
  for (const data of [
    {},
    { energy: 5 },
    { worked: "a".repeat(501) },
    { user_id: b },
    { fatigue: 1.5 },
  ])
    await assert.rejects(
      db.query("select save_daily_checkin($1,$2)", [day, JSON.stringify(data)]),
    );
  await assert.rejects(
    db.query("select save_daily_checkin($1,$2)", [
      shift(1),
      JSON.stringify({ sleep_hours: 0 }),
    ]),
  );
  await as(b);
  assert.equal((await db.query("select * from daily_checkins")).rows.length, 0);
  await db.query("select save_daily_checkin($1,$2)", [
    day,
    JSON.stringify({ sleep_hours: 0 }),
  ]);
  row = (await db.query("select * from daily_checkins")).rows[0];
  assert.equal(row.sleep_hours, "0.00");
  assert.equal(row.fatigue, null);
});
test("contexto alimentar não exige alimentos, preserva escalas e mantém isolamento", async () => {
  await as(a);
  await db.query(
    "insert into eating_context_events(project_id,logged_on,context,hunger) values($1,$2,$3,0)",
    [pb, day, "social"],
  );
  const row = (await db.query("select * from eating_context_events")).rows[0];
  assert.equal(row.project_id, pa);
  assert.equal(row.hunger, 0);
  assert.equal(row.satiety, null);
  assert.equal(
    (await db.query("select count(*)::int as n from meal_items")).rows[0].n,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into eating_context_events(project_id,logged_on,context,hunger) values($1,$2,$3,11)",
      [pa, day, "routine"],
    ),
  );
  await as(b);
  assert.equal(
    (
      await db.query(
        "delete from eating_context_events where id=$1 returning *",
        [row.id],
      )
    ).rows.length,
    0,
  );
});
test("planos têm vigência explícita e futuro não substitui referência de hoje", async () => {
  await as(a);
  const document = { version: "1", meals: [{}] };
  await db.query(
    "insert into diet_plans(project_id,title,document,effective_from) values($1,$2,$3,$4)",
    [pa, "Hoje", JSON.stringify(document), day],
  );
  await db.query(
    "insert into diet_plans(project_id,title,document,effective_from) values($1,$2,$3,$4)",
    [pa, "Futuro", JSON.stringify(document), shift(1)],
  );
  const future = (
    await db.query("select id from diet_plans where title='Futuro'")
  ).rows[0].id;
  await assert.rejects(
    db.query(
      "insert into meal_items(project_id,logged_on,category,name,amount,unit,reference_amount,source,plan_id,plan_meal_index,plan_food_index) values($1,$2,'breakfast','QA',100,'g',100,'QA',$3,0,0)",
      [pa, day, future],
    ),
  );
  assert.equal(
    (
      await db.query(
        "select title from diet_plans where effective_from<=$1 order by effective_from desc,created_at desc limit 1",
        [day],
      )
    ).rows[0].title,
    "Hoje",
  );
  await assert.rejects(
    db.query(
      "insert into diet_plans(project_id,title,document,effective_from) values($1,$2,$3,$4)",
      [pa, "Fora", JSON.stringify(document), shift(100)],
    ),
  );
});
test("encerramento bloqueia alterações e exclusão de projeto remove novos registros", async () => {
  await as(a);
  await db.query("update projects set status='COMPLETED' where id=$1", [pa]);
  await assert.rejects(
    db.query("update daily_checkins set fatigue=4 where project_id=$1", [pa]),
  );
  await assert.rejects(
    db.query("delete from eating_context_events where project_id=$1", [pa]),
  );
  await assert.rejects(
    db.query("update project_phases set name='Outro' where project_id=$1", [
      pa,
    ]),
  );
  await assert.rejects(
    db.query("select save_daily_checkin($1,$2)", [
      day,
      JSON.stringify({ energy: 4 }),
    ]),
  );
  await db.query("select delete_project($1,$2)", [pa, "Ciclo A"]);
  for (const table of [
    "project_phases",
    "daily_checkins",
    "eating_context_events",
    "diet_plans",
  ])
    assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
  assert.equal(
    (await db.query("select * from display_preferences")).rows.length,
    1,
  );
  await db.exec("reset role");
  await db.query("delete from auth.users where id=$1", [a]);
  assert.equal(
    (await db.query("select * from display_preferences")).rows.length,
    0,
  );
});
