import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
const owner = "00000000-0000-4000-8000-000000000091";
const other = "00000000-0000-4000-8000-000000000092";
const avatar = "00000000-0000-4000-8000-000000000093";
const db = await createDatabase([owner, other]);
after(() => db.close());
test("relógio da fila: upload recebe quinze minutos no banco; remoção fica disponível imediatamente", async () => {
  await db.query(
    "insert into public.avatar_cleanup(user_id,avatar_id) values($1,$2)",
    [owner, avatar],
  );
  const created = (
    await db.query(
      "select extract(epoch from (available_after-created_at)) as delay from public.avatar_cleanup where user_id=$1",
      [owner],
    )
  ).rows[0];
  assert.equal(Number(created.delay), 900);
  await db.exec("set role service_role");
  assert.equal(
    (await db.query("select * from public.due_avatar_jobs($1,100)", [owner]))
      .rows.length,
    0,
  );
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.exec("set role authenticated");
  await db.query("select public.set_profile_avatar($1)", [avatar]);
  await db.query("select public.remove_profile_avatar($1)", [avatar]);
  await db.exec("reset role;set role service_role");
  const due = (
    await db.query("select * from public.due_avatar_jobs($1,100)", [owner])
  ).rows;
  assert.equal(due.length, 1);
  assert.equal(due[0].avatar_id, avatar);
  assert.equal(due[0].revision, 2);
  await db.exec("reset role");
});
test("relógio da fila: clientes e anônimo não executam a leitura administrativa", async () => {
  for (const role of ["authenticated", "anon"]) {
    await db.exec(`reset role;set role ${role}`);
    await assert.rejects(
      db.query("select * from public.due_avatar_jobs(null,100)"),
      { code: "42501" },
    );
  }
  await db.exec("reset role");
});
test("relógio da fila: filtro de proprietário e limite máximo não expõem nem alteram outros trabalhos", async () => {
  await db.query(
    "insert into public.avatar_cleanup(user_id,avatar_id,available_after) select $1,('00000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,now()-interval '1 minute' from generate_series(1,105) g",
    [other],
  );
  await db.exec("set role service_role");
  assert.equal(
    (await db.query("select * from public.due_avatar_jobs($1,999)", [other]))
      .rows.length,
    100,
  );
  assert.equal(
    (await db.query("select * from public.due_avatar_jobs($1,0)", [other])).rows
      .length,
    1,
  );
  assert.equal(
    (await db.query("select * from public.due_avatar_jobs($1,10)", [owner]))
      .rows.length,
    1,
  );
  await db.exec("reset role");
  assert.equal(
    Number(
      (
        await db.query(
          "select count(*) from public.avatar_cleanup where user_id=$1",
          [other],
        )
      ).rows[0].count,
    ),
    105,
  );
});
