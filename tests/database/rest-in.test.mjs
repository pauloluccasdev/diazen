import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, rest } from "../fixtures/database.mjs";
const a = "00000000-0000-4000-8000-000000000071",
  b = "00000000-0000-4000-8000-000000000072";
const db = await createDatabase([a, b]);
after(() => db.close());
for (const user of [a, b]) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
  await db.query(
    "insert into projects(name,starts_on) values('Plano, A','2026-11-01')",
  );
  if (user === a)
    await db.query(
      "insert into projects(name,starts_on) values('Plano \"B\"','2026-11-18')",
    );
  await db.exec("reset role");
}
async function get(user, filter) {
  const url = new URL("http://127.0.0.1/rest/v1/projects");
  url.searchParams.set("select", "name,starts_on");
  for (const [key, value] of Object.entries(filter))
    url.searchParams.set(key, value);
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.data = JSON.parse(body);
    },
  };
  await rest(db, { method: "GET", headers: {} }, response, url, user);
  return response;
}
test("adaptador REST IN consulta datas exatas com parâmetros e RLS real", async () => {
  const result = await get(a, { starts_on: "in.(2026-11-01,2026-11-18)" });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.length, 2);
  const other = await get(b, { starts_on: "in.(2026-11-01,2026-11-18)" });
  assert.equal(other.data.length, 1);
  assert.equal(other.data[0].name, "Plano, A");
});
test("adaptador REST IN preserva vírgulas/aspas em valores citados", async () => {
  const result = await get(a, { name: 'in.("Plano, A","Plano \\"B\\"")' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.length, 2);
});
test("adaptador REST IN vazio ou conteúdo SQL não amplia a seleção", async () => {
  const empty = await get(a, { name: "in.()" });
  assert.deepEqual(empty.data, []);
  const injected = await get(a, { name: 'in.("x\') or true --")' });
  assert.equal(injected.statusCode, 200);
  assert.deepEqual(injected.data, []);
  const intact = await get(a, { starts_on: "in.(2026-11-01,2026-11-18)" });
  assert.equal(intact.data.length, 2);
});
