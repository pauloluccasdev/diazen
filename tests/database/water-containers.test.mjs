import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
const a = "00000000-0000-4000-8000-000000000061";
const b = "00000000-0000-4000-8000-000000000062";
const db = await createDatabase([a, b]);
after(() => db.close());
async function as(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
let container;
test("recipientes são da conta, isolados e negados a anônimos", async () => {
  await as(a);
  container = (
    await db.query(
      "insert into water_containers(name,volume_ml) values(' Garrafa ',750) returning *",
    )
  ).rows[0];
  assert.equal(container.user_id, a);
  assert.equal(container.name, "Garrafa");
  await as(b);
  assert.equal(
    (await db.query("select * from water_containers")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "update water_containers set volume_ml=500 where id=$1 returning *",
        [container.id],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query("delete from water_containers where id=$1 returning *", [
        container.id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into water_containers(user_id,name,volume_ml) values($1,'Outro',250)",
      [a],
    ),
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(db.query("select * from water_containers"));
});
test("valida limites, preserva identidade e impõe limite de cadastro", async () => {
  await as(a);
  for (const [name, volume] of [
    ["", 250],
    [" ", 250],
    ["x".repeat(61), 250],
    ["Copo", 0],
    ["Copo", 5001],
  ]) {
    await assert.rejects(
      db.query("insert into water_containers(name,volume_ml) values($1,$2)", [
        name,
        volume,
      ]),
    );
  }
  await assert.rejects(
    db.query("update water_containers set id=gen_random_uuid() where id=$1", [
      container.id,
    ]),
  );
  await assert.rejects(
    db.query(
      "update water_containers set created_at=created_at-interval '1 day' where id=$1",
      [container.id],
    ),
  );
  await db.query(
    "insert into water_containers(name,volume_ml) select 'Copo '||n,250 from generate_series(1,49) n",
  );
  assert.equal(
    (await db.query("select count(*)::int n from water_containers")).rows[0].n,
    50,
  );
  await assert.rejects(
    db.query(
      "insert into water_containers(name,volume_ml) values('Excedente',250)",
    ),
  );
  await db.query(
    "update water_containers set name='Garrafa nova',volume_ml=1000 where id=$1",
    [container.id],
  );
  assert.equal(
    (
      await db.query("select volume_ml from water_containers where id=$1", [
        container.id,
      ])
    ).rows[0].volume_ml,
    1000,
  );
});
test("renomear ou remover recipiente não reescreve consumo e exclusão da conta elimina cadastro", async () => {
  await as(a);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  await db.query(
    "select public.create_project('Água',$1,$1,2000,'track',null,null,3)",
    [day],
  );
  await db.query(
    "insert into water_entries(logged_on,volume_ml,container_label) values($1,750,'Garrafa')",
    [day],
  );
  await db.query("delete from water_containers where id=$1", [container.id]);
  const row = (
    await db.query("select volume_ml,container_label from water_entries")
  ).rows[0];
  assert.deepEqual(row, { volume_ml: 750, container_label: "Garrafa" });
  await db.exec("reset role");
  await db.query("insert into account_deletions(user_id) values($1)", [a]);
  await as(a);
  assert.equal(
    (await db.query("select * from water_containers")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into water_containers(name,volume_ml) values('Bloqueado',250)",
    ),
  );
  await db.exec("reset role");
  await db.query("delete from auth.users where id=$1", [a]);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from water_containers where user_id=$1",
        [a],
      )
    ).rows[0].n,
    0,
  );
});
