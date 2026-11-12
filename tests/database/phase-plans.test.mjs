import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
import { validatePhasePlan } from "../../src/lib/phase-plans.ts";
const a = "00000000-0000-4000-8000-000000000041",
  b = "00000000-0000-4000-8000-000000000042",
  workout = "00000000-0000-4000-8000-000000000043",
  exercise = "00000000-0000-4000-8000-000000000044";
const strength = {
  version: 1,
  notes: "QA",
  workouts: [
    {
      id: workout,
      label: "Ficha A QA",
      weekdays: [1, 3],
      notes: "",
      exercises: [
        {
          id: exercise,
          name: "Exercício QA",
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 60,
          notes: "",
        },
      ],
    },
  ],
};
const water = {
  version: 1,
  min_ml: 2000,
  max_ml: 2500,
  notes: "Referência QA",
  schedule: [{ label: "Manhã", time: "08:00", min_ml: 300, max_ml: 500 }],
  alternatives: [{ label: "Alternativa QA", min_ml: 2200, max_ml: 2700 }],
};
test("valida cadastros sem inventar valores, limita listas e descarta campos extras", () => {
  assert.deepEqual(
    validatePhasePlan("strength", { ...strength, secret: "descartar" }),
    strength,
  );
  assert.deepEqual(validatePhasePlan("hydration", water), water);
  for (const data of [
    { ...water, min_ml: 0 },
    { ...water, max_ml: 1000 },
    { ...water, schedule: [{ ...water.schedule[0], time: "25:00" }] },
  ])
    assert.throws(() => validatePhasePlan("hydration", data));
  assert.throws(() =>
    validatePhasePlan("strength", {
      ...strength,
      workouts: [
        {
          ...strength.workouts[0],
          exercises: [{ ...strength.workouts[0].exercises[0], sets: 0 }],
        },
      ],
    }),
  );
});
const db = await createDatabase([a, b]);
after(() => db.close());
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const shift = (n) => {
  const d = new Date(date + "T12:00:00Z");
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
    await db.query("select create_project($1,$2,$3,2000) id", [
      name,
      shift(-2),
      shift(90),
    ])
  ).rows[0].id;
}
const pa = await project(a, "Planos QA"),
  pb = await project(b, "Outra conta");
let phase, asset, hydration, training, activity;
test("referência visual é privada, isolada e fora da galeria corporal", async () => {
  await as(a);
  asset = "00000000-0000-4000-8000-000000000045";
  const path = `${a}/${pa}/${asset}.webp`;
  await db.query(
    "insert into plan_assets(id,project_id,name,storage_key) values($1,$2,$3,$4)",
    [asset, pa, "Referência QA", path],
  );
  assert.equal((await db.query("select * from photos")).rows.length, 0);
  await db.exec("reset role");
  await db.query(
    "insert into storage.objects(bucket_id,name) values('body-photos',$1)",
    [path],
  );
  await as(a);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    1,
  );
  await as(b);
  assert.equal((await db.query("select * from plan_assets")).rows.length, 0);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into plan_assets(project_id,name,storage_key) values($1,$2,$3)",
      [pa, "Forjada", path],
    ),
  );
});
test("versões são imutáveis, vinculam apenas referências próprias e congelam a vigência da fase", async () => {
  await as(a);
  phase = (
    await db.query(
      "insert into project_phases(project_id,name,starts_on,ends_on,objective) values($1,$2,$3,$4,$5) returning id",
      [pa, "Base QA", date, shift(10), "Rotina QA"],
    )
  ).rows[0].id;
  hydration = (
    await db.query(
      "insert into phase_plans(project_id,phase_id,reference_image_id,kind,title,effective_from,document) values($1,$2,$3,'hydration','Água QA',$4,$5) returning *",
      [pa, phase, asset, date, JSON.stringify(water)],
    )
  ).rows[0];
  assert.equal(hydration.phase_name, "Base QA");
  assert.equal(hydration.valid_until.toISOString().slice(0, 10), shift(10));
  await assert.rejects(
    db.query("update phase_plans set title='Outro' where id=$1", [
      hydration.id,
    ]),
  );
  await assert.rejects(
    db.query("delete from plan_assets where id=$1", [asset]),
  );
  training = (
    await db.query(
      "insert into phase_plans(project_id,phase_id,kind,title,effective_from,document) values($1,$2,'strength','Fichas QA',$3,$4) returning id",
      [pa, phase, date, JSON.stringify(strength)],
    )
  ).rows[0].id;
  await assert.rejects(
    db.query(
      "insert into phase_plans(project_id,kind,title,effective_from,document) values($1,'hydration','Inválido',$2,$3)",
      [pa, date, JSON.stringify({ ...water, min_ml: 0 })],
    ),
  );
  await db.query("delete from project_phases where id=$1", [phase]);
  const kept = (
    await db.query("select * from phase_plans where id=$1", [hydration.id])
  ).rows[0];
  assert.equal(kept.phase_id, null);
  assert.equal(kept.phase_name, "Base QA");
  assert.equal(kept.valid_until.toISOString().slice(0, 10), shift(10));
  await as(b);
  assert.equal((await db.query("select * from phase_plans")).rows.length, 0);
  await assert.rejects(
    db.query(
      "insert into phase_plans(project_id,reference_image_id,kind,title,effective_from,document) values($1,$2,'hydration','Forjado',$3,$4)",
      [pb, asset, date, JSON.stringify(water)],
    ),
  );
});
const req = "00000000-0000-4000-8000-000000000046";
test("execução é explícita e idempotente; esforço zero é conhecido", async () => {
  await as(a);
  assert.equal((await db.query("select * from activities")).rows.length, 0);
  activity = (
    await db.query(
      "select record_planned_workout($1,$2,$3,$4,30,0,null,null) id",
      [req, training, workout, date],
    )
  ).rows[0].id;
  assert.equal((await db.query("select * from activities")).rows.length, 1);
  assert.equal(
    (await db.query("select * from workout_links")).rows[0].rpe,
    "0.0",
  );
  assert.equal(
    (
      await db.query(
        "select record_planned_workout($1,$2,$3,$4,30,0,null,null) id",
        [req, training, workout, date],
      )
    ).rows[0].id,
    activity,
  );
  await assert.rejects(
    db.query("select record_planned_workout($1,$2,$3,$4,45,0,null,null)", [
      req,
      training,
      workout,
      date,
    ]),
  );
  await assert.rejects(
    db.query(
      "select record_planned_workout(gen_random_uuid(),$1,$2,$3,30,null,null,null)",
      [hydration.id, workout, date],
    ),
  );
  await assert.rejects(
    db.query(
      "select record_planned_workout(gen_random_uuid(),$1,$2,$3,30,null,null,null)",
      [training, workout, shift(1)],
    ),
  );
  await as(b);
  await assert.rejects(
    db.query(
      "select record_planned_workout(gen_random_uuid(),$1,$2,$3,30,null,null,null)",
      [training, workout, date],
    ),
  );
});
test("vínculo de atividade existente preserva a sessão e impede contagem duplicada", async () => {
  await as(a);
  const existing = (
    await db.query(
      "insert into activities(logged_on,modality,duration_min,name) values($1,'strength',40,'Existente QA') returning id",
      [date],
    )
  ).rows[0].id;
  await db.query(
    "select record_planned_workout(gen_random_uuid(),$1,$2,$3,40,null,$4,$5)",
    [training, workout, date, existing, "Adaptei o dia"],
  );
  assert.equal((await db.query("select * from activities")).rows.length, 2);
  assert.equal((await db.query("select * from workout_links")).rows.length, 2);
  await assert.rejects(
    db.query(
      "select record_planned_workout(gen_random_uuid(),$1,$2,$3,40,null,$4,null)",
      [training, workout, date, existing],
    ),
  );
  assert.equal((await db.query("select * from activities")).rows.length, 2);
});
test("encerramento bloqueia execução e exclusão limpa metadados mantendo fila durável", async () => {
  await as(a);
  await db.query("update projects set status='COMPLETED' where id=$1", [pa]);
  await assert.rejects(
    db.query(
      "select record_planned_workout(gen_random_uuid(),$1,$2,$3,30,null,null,null)",
      [training, workout, date],
    ),
  );
  await assert.rejects(
    db.query("delete from plan_assets where id=$1", [asset]),
  );
  await assert.rejects(db.query("select * from plan_asset_cleanup"));
  await db.query("select delete_project($1,$2)", [pa, "Planos QA"]);
  for (const table of ["plan_assets", "phase_plans", "workout_links"])
    assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
  await db.exec("reset role");
  const job = (await db.query("select * from plan_asset_cleanup")).rows[0];
  assert.equal(job.asset_id, asset);
  assert.equal(job.paths.length, 1);
  await db.query("delete from auth.users where id=$1", [a]);
  assert.equal(
    (await db.query("select * from plan_asset_cleanup")).rows.length,
    1,
  );
});
