import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../fixtures/database.mjs";
const alice = "00000000-0000-4000-8000-000000000091",
  bob = "00000000-0000-4000-8000-000000000092";
const db = await createDatabase([alice, bob]);
after(() => db.close());
async function role(user) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
}
const date = (
  await db.query(
    "select (now() at time zone 'America/Sao_Paulo')::date::text d",
  )
).rows[0].d;
await role(alice);
const project = (
  await db.query(
    "select public.create_project('Grupo',$1::date-1,null,2000) id",
    [date],
  )
).rows[0].id;
await db.query(
  "insert into public.meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal) select $1::date,'breakfast','Teste',10,'g',100,'Manual',100 from generate_series(1,25)",
  [date],
);
await db.query(
  "insert into public.meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal) values($1,'dinner','Jantar',10,'g',100,'Manual',100),($1::date-1,'breakfast','Ontem',10,'g',100,'Manual',100)",
  [date],
);
await role(bob);
const other = (
  await db.query("select public.create_project('Outro',$1,null,2000) id", [
    date,
  ])
).rows[0].id;
await db.query(
  "insert into public.meal_items(logged_on,category,name,amount,unit,reference_amount,source) values($1,'breakfast','Outro',10,'g',100,'Manual')",
  [date],
);
const remove = () =>
  db.query(
    "delete from public.meal_items where project_id=$1 and logged_on=$2 and category='breakfast' returning id",
    [project, date],
  );
test("outro usuário não exclui grupo alheio", async () => {
  assert.equal((await remove()).rows.length, 0);
});
test("exclui todo o grupo além da página e preserva outras datas, categorias e usuários", async () => {
  await role(alice);
  assert.equal((await remove()).rows.length, 25);
  assert.equal(
    Number(
      (await db.query("select count(*) n from public.meal_items")).rows[0].n,
    ),
    2,
  );
  await role(bob);
  assert.equal(
    Number(
      (
        await db.query(
          "select count(*) n from public.meal_items where project_id=$1",
          [other],
        )
      ).rows[0].n,
    ),
    1,
  );
});
test("grupo de projeto encerrado permanece somente leitura", async () => {
  await role(alice);
  await db.query("update public.projects set status='COMPLETED' where id=$1", [
    project,
  ]);
  await assert.rejects(() =>
    db.query(
      "delete from public.meal_items where project_id=$1 and category='dinner'",
      [project],
    ),
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select count(*) n from public.meal_items where project_id=$1 and category='dinner'",
          [project],
        )
      ).rows[0].n,
    ),
    1,
  );
});
