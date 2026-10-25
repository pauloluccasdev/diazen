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
async function role(name = "authenticated", user = alice) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function scalar(sql, args = []) {
  return (await db.query(sql, args)).rows[0];
}
async function importActivity(id = "101", extra = {}, lease = null) {
  return (
    await scalar(
      "select public.garmin_import_activity($1,$2::jsonb,$3) result",
      [
        alice,
        JSON.stringify({
          id,
          name: "Corrida fictícia",
          sport: "running",
          modality: "running",
          date: date + " 08:00:00",
          seconds: 1800,
          metres: 5000,
          calories: 0,
          startedAt: new Date(Date.now() - 60000).toISOString(),
          ...extra,
        }),
        lease,
      ],
    )
  ).result;
}
await role();
const project = (
  await scalar("select public.create_project('Garmin QA',$1,null,2000) id", [
    date,
  ])
).id;

test("importação verificada preserva origem, zero, ausência e deduplica no banco", async () => {
  await role("service_role", "");
  const result = await importActivity();
  assert.equal(result.status, "imported");
  assert.equal((await importActivity()).status, "already_imported");
  assert.equal(
    (await importActivity("102", { metres: null, calories: null })).status,
    "imported",
  );
  await role();
  const rows = (
    await db.query("select * from public.activities order by external_id")
  ).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].project_id, project);
  assert.equal(rows[0].user_id, alice);
  assert.equal(Number(rows[0].kcal), 0);
  assert.equal(rows[1].kcal, null);
  assert.equal(rows[1].distance_km, null);
  assert.equal(rows[0].name, "Corrida fictícia");
  assert.equal(rows[0].external_type, "running");
  assert.equal(Number(rows[0].duration_min), 30);
  const summary = (
    await scalar("select public.project_summary($1,$2) data", [project, date])
  ).data;
  assert.equal(summary.sessions, 2);
});
test("autorização isola dados, impede origem forjada e comandos administrativos", async () => {
  await role("authenticated", bob);
  for (const table of ["activities", "garmin_imports", "garmin_sync_settings"])
    assert.equal(
      (await db.query(`select * from public.${table}`)).rows.length,
      0,
    );
  await assert.rejects(
    () => db.query("select public.garmin_import_activity($1,'{}')", [alice]),
    /permission denied/,
  );
  await role();
  await assert.rejects(
    () =>
      db.query(
        "insert into public.activities(logged_on,modality,duration_min,external_provider,external_id,external_type) values($1,'strength',20,'garmin','999','strength_training')",
        [date],
      ),
    /Origem requer/,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into public.activities(logged_on,modality,duration_min) values($1,'running',20)",
        [date],
      ),
    /activities_distance_required/,
  );
  await assert.rejects(
    () =>
      db.exec(
        "update public.activities set external_id='999' where external_id='101'",
      ),
    /Origem imutável/,
  );
});
test("excluir importação não a recria; edição do diário fica preservada", async () => {
  await role();
  await db.exec(
    "update public.activities set name='Título revisado',kcal=123 where external_id='101'",
  );
  await db.exec("delete from public.activities where external_id='102'");
  const removed = await scalar(
    "select activity_id from public.garmin_imports where external_id='102'",
  );
  assert.equal(removed.activity_id, null);
  await role("service_role", "");
  assert.equal((await importActivity()).status, "already_imported");
  assert.equal((await importActivity("102")).status, "already_imported");
  await role();
  assert.equal(
    (await scalar("select name from public.activities where external_id='101'"))
      .name,
    "Título revisado",
  );
});
test("lease de sincronização, marco inicial, pausa e limite temporal são respeitados", async () => {
  await role("service_role", "");
  const claim = (
    await scalar("select public.garmin_claim_sync($1) data", [alice])
  ).data;
  assert.ok(claim.lease);
  assert.equal(
    (await scalar("select public.garmin_claim_sync($1) data", [alice])).data,
    null,
  );
  assert.equal(
    (await importActivity("103", {}, claim.lease)).status,
    "before_activation",
  );
  await role("postgres", "");
  await db.query(
    "update public.garmin_sync_settings set auto_after=now()-interval '1 hour' where user_id=$1",
    [alice],
  );
  await role("service_role", "");
  assert.equal(
    (
      await importActivity(
        "103",
        { sport: "walking", modality: "other", metres: 0 },
        claim.lease,
      )
    ).status,
    "imported",
  );
  await role();
  await db.exec("update public.garmin_sync_settings set enabled=false");
  await assert.rejects(
    () => db.exec("update public.garmin_sync_settings set auto_after=now()"),
    /permission denied/,
  );
  await role("service_role", "");
  assert.equal((await importActivity("104", {}, claim.lease)).status, "paused");
  await db.query("select public.garmin_finish_sync($1,$2,true,0)", [
    alice,
    claim.lease,
  ]);
  assert.equal(
    (await scalar("select public.garmin_claim_sync($1) data", [alice])).data,
    null,
  );
  assert.equal(
    (await importActivity("105", { date: "2000-01-01" })).status,
    "outside_project",
  );
  assert.equal(
    (await importActivity("106", { seconds: 0 })).status,
    "needs_review",
  );
});
test("histórico encerrado não recebe gravação e a exclusão da conta bloqueia sincronização", async () => {
  await role();
  await db.exec(
    "update public.projects set status='COMPLETED' where status='ACTIVE'",
  );
  await role("service_role", "");
  assert.equal((await importActivity("107")).status, "no_active_project");
  await role();
  await db.exec("select public.request_account_deletion()");
  await role("service_role", "");
  assert.equal(
    (await scalar("select public.garmin_claim_sync($1) data", [alice])).data,
    null,
  );
  await assert.rejects(() => importActivity("108"), /Conta indisponível/);
});
