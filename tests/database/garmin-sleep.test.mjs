import { test, after } from "node:test";
import assert from "node:assert/strict";
import { garminSleep, GarminFailure } from "../../src/lib/garmin-provider.ts";
import { createDatabase } from "../fixtures/database.mjs";
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const transport = (data) => {
  let count = 0;
  return async (url) => {
    assert.ok(
      String(url).startsWith("https://personal.connectapi.garmin.com/"),
    );
    return ++count === 1 ? new Response("a.b.c") : Response.json(data);
  };
};
test("normaliza apenas sono, preserva zero/ausente e descarta dados de perfil", async () => {
  const rows = await garminSleep(
    "synthetic-key",
    date,
    date,
    transport([
      {
        calendarDate: date,
        sleepTimeSeconds: 27000,
        deepSleepSeconds: 3600,
        remSleepSeconds: -1,
        napTimeSeconds: 0,
        sleepScores: { overall: { value: 0 } },
        sleepStartTimestampGMT: date + "T00:00:00Z",
        userProfilePK: 12345,
        private: "sensitive",
      },
    ]),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].total_seconds, 27000);
  assert.equal(rows[0].nap_seconds, 0);
  assert.equal(rows[0].rem_seconds, null);
  assert.equal(rows[0].light_seconds, null);
  assert.equal(rows[0].score, 0);
  assert.ok(!JSON.stringify(rows).includes("12345"));
  assert.ok(!JSON.stringify(rows).includes("sensitive"));
});
test("não transforma placeholder em noite sem sono e aceita resposta vazia", async () => {
  assert.deepEqual(await garminSleep("x", date, date, transport([])), []);
  assert.deepEqual(
    await garminSleep(
      "x",
      date,
      date,
      transport([
        { calendarDate: date, sleepTimeSeconds: 0, napTimeSeconds: 0 },
      ]),
    ),
    [],
  );
  const rows = await garminSleep(
    "x",
    date,
    date,
    transport([
      {
        calendarDate: date,
        sleepWindowConfirmed: true,
        sleepTimeSeconds: 0,
        sleepScores: { overall: { value: 100, qualifierKey: "INVALID" } },
      },
    ]),
  );
  assert.equal(rows[0].total_seconds, 0);
  assert.equal(rows[0].score, null);
});
test("limita janela/host e trata falha do provedor sem expor resposta", async () => {
  await assert.rejects(() =>
    garminSleep("x", "2026-01-01", "2026-01-10", transport([])),
  );
  await assert.rejects(() =>
    garminSleep("x", "../secret", date, transport([])),
  );
  await assert.rejects(
    () =>
      garminSleep(
        "x",
        date,
        date,
        async () => new Response("private-body", { status: 429 }),
      ),
    (e) =>
      e instanceof GarminFailure &&
      e.reason === "rate_limit" &&
      !e.message.includes("private"),
  );
  await assert.rejects(() =>
    garminSleep("x", date, date, transport({ profile: 123 })),
  );
});
const alice = "00000000-0000-4000-8000-000000000091",
  bob = "00000000-0000-4000-8000-000000000092";
const db = await createDatabase([alice, bob]);
after(() => db.close());
async function role(user = alice, name = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function val(sql, args = []) {
  return (await db.query(sql, args)).rows[0];
}
await role();
const project = (
  await val("select public.create_project('Sono QA',$1,null,2000) id", [date])
).id;
let lease;
const data = {
  date,
  total_seconds: 27000,
  nap_seconds: 0,
  deep_seconds: 3600,
  light_seconds: null,
  rem_seconds: 5000,
  awake_seconds: 0,
  score: 0,
  started_at: null,
  ended_at: null,
};
const store = (extra = {}, user = alice) =>
  val("select public.garmin_store_sleep($1,$2,$3) saved", [
    user,
    lease,
    JSON.stringify({ ...data, ...extra }),
  ]);
test("adesão começa desativada, RPCs administrativas e escrita direta são bloqueadas", async () => {
  await role("", "service_role");
  assert.equal(
    (await val("select public.garmin_claim_sleep($1) claim", [alice])).claim,
    null,
  );
  await role();
  await assert.rejects(() =>
    val("select public.garmin_claim_sleep($1)", [alice]),
  );
  await assert.rejects(() =>
    db.query(
      "insert into public.sleep_records(user_id,project_id,logged_on) values($1,$2,$3)",
      [alice, project, date],
    ),
  );
  await val("select public.set_garmin_sleep_sync(true)");
  await assert.rejects(() =>
    db.query("select lease_id from public.garmin_sleep_settings"),
  );
  await role(bob);
  assert.equal(
    (await db.query("select enabled from public.garmin_sleep_settings")).rows
      .length,
    0,
  );
});
test("claim limita repetição, atualiza o mesmo dia sem duplicar e isola proprietário", async () => {
  await role("", "service_role");
  lease = (await val("select public.garmin_claim_sleep($1) claim", [alice]))
    .claim.lease;
  assert.equal(
    (await val("select public.garmin_claim_sleep($1) claim", [alice])).claim,
    null,
  );
  assert.equal((await store()).saved, true);
  assert.equal((await store()).saved, false);
  assert.equal((await store({ score: 82 })).saved, true);
  assert.equal((await store({}, bob)).saved, false);
  await role();
  const rows = await db.query("select * from public.sleep_records");
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].score, 82);
  assert.equal(rows.rows[0].light_seconds, null);
  await role(bob);
  assert.equal(
    (await db.query("select * from public.sleep_records")).rows.length,
    0,
  );
});
test("pausa bloqueia worker em andamento, histórico encerrado não muda e exclusão limpa sono", async () => {
  await role();
  await val("select public.set_garmin_sleep_sync(false)");
  await role("", "service_role");
  assert.equal((await store({ score: 99 })).saved, false);
  await role();
  assert.equal((await val("select score from public.sleep_records")).score, 82);
  await val("select public.set_garmin_sleep_sync(true)");
  await role("", "service_role");
  lease = (await val("select public.garmin_claim_sleep($1) claim", [alice]))
    .claim.lease;
  await role();
  await db.query("update public.projects set status='COMPLETED' where id=$1", [
    project,
  ]);
  await role("", "service_role");
  assert.equal((await store({ score: 99 })).saved, false);
  await role();
  await db.query("select public.delete_project($1,$2)", [project, "Sono QA"]);
  assert.equal(
    (await db.query("select * from public.sleep_records")).rows.length,
    0,
  );
});
