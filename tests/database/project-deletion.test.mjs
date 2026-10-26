import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
const alice = "00000000-0000-4000-8000-000000000091",
  bob = "00000000-0000-4000-8000-000000000092";
const db = await createDatabase([alice, bob]);
after(() => db.close());
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
async function role(user = alice, name = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function scalar(sql, args = []) {
  return (await db.query(sql, args)).rows[0];
}
await role();
const { id } = await scalar(
  "select public.create_project('Apagar',$1,null,2000) id",
  [date],
);
await db.query(
  "insert into public.water_entries(logged_on,volume_ml) values($1,250)",
  [date],
);
await db.query("select public.save_weight($1,90)", [date]);
await db.query(
  "insert into public.measurements(logged_on,measurement_type,value_cm) values($1,'waist',90)",
  [date],
);
await db.query(
  "insert into public.activities(logged_on,modality,duration_min) values($1,'strength',30)",
  [date],
);
await db.query(
  "insert into public.meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal) values($1,'breakfast','Teste',10,'g',100,'Manual',30)",
  [date],
);
await db.query(
  "insert into public.meal_days(logged_on,confirmed) values($1,true)",
  [date],
);
const photo = "00000000-0000-4000-8000-000000000099";
await db.query(
  "insert into public.photos(id,logged_on,category,storage_key,thumbnail_key) values($1,$2,'front',$3,$4)",
  [
    photo,
    date,
    `${alice}/${id}/${photo}.webp`,
    `${alice}/${id}/${photo}-thumb.webp`,
  ],
);
await db.query(
  "insert into public.diet_plans(project_id,title,document) values($1,'Plano',$2)",
  [id, JSON.stringify({ version: 1, meals: [{}] })],
);
await db.query("update public.projects set status='COMPLETED' where id=$1", [
  id,
]);
const retained = (
  await scalar("select public.create_project('Preservar',$1,null,2000) id", [
    date,
  ])
).id;
await db.query(
  "insert into public.water_entries(logged_on,volume_ml) values($1,500)",
  [date],
);
await role(bob);
const foreign = (
  await scalar(
    "select public.create_project('Outro usuário',$1,null,1000) id",
    [date],
  )
).id;

test("exclusão não pode atingir outro proprietário, pular confirmação nem liberar DELETE direto", async () => {
  await assert.rejects(() =>
    db.query("select public.delete_project($1,$2)", [id, "Apagar"]),
  );
  await role();
  await assert.rejects(() =>
    db.query("select public.delete_project($1,$2)", [id, "Errado"]),
  );
  await assert.rejects(() =>
    db.query("delete from public.projects where id=$1", [id]),
  );
  await role("", "anon");
  await assert.rejects(() =>
    db.query("select public.delete_project($1,$2)", [id, "Apagar"]),
  );
});
test("exclui histórico em cascata, mantém fila de fotos e preserva outros projetos", async () => {
  await role();
  await db.query("select public.delete_project($1,$2)", [id, "Apagar"]);
  await db.exec("reset role");
  for (const table of [
    "projects",
    "water_goals",
    "water_entries",
    "weights",
    "measurements",
    "activities",
    "meal_items",
    "meal_days",
    "photos",
    "diet_plans",
    "audit_events",
  ]) {
    const key = table === "projects" ? "id" : "project_id";
    assert.equal(
      Number(
        (
          await scalar(
            `select count(*) count from public.${table} where ${key}=$1`,
            [id],
          )
        ).count,
      ),
      0,
      table,
    );
  }
  assert.equal(
    Number(
      (
        await scalar(
          "select count(*) count from public.photo_cleanup where photo_id=$1",
          [photo],
        )
      ).count,
    ),
    1,
  );
  assert.equal(
    Number(
      (
        await scalar(
          "select count(*) count from public.projects where id in ($1,$2)",
          [retained, foreign],
        )
      ).count,
    ),
    2,
  );
  assert.equal(
    Number(
      (
        await scalar(
          "select count(*) count from public.water_entries where project_id=$1",
          [retained],
        )
      ).count,
    ),
    1,
  );
});
test("rascunhos e ativos também podem ser excluídos pelo dono; conta indisponível é bloqueada", async () => {
  await role();
  const draft = (
    await scalar(
      "select public.create_project('Rascunho',$1,null,null,'none',null,null,null,false) id",
      [date],
    )
  ).id;
  await db.query("select public.delete_project($1,$2)", [draft, "Rascunho"]);
  await db.query("select public.delete_project($1,$2)", [
    retained,
    "Preservar",
  ]);
  await db.query("select public.request_account_deletion()");
  await assert.rejects(() =>
    db.query("select public.delete_project($1,$2)", [foreign, "Outro usuário"]),
  );
});
