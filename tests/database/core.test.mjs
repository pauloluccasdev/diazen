import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
const db = new PGlite();
let restoredDb;
after(async () => {
  if (!db.closed) await db.close();
  if (restoredDb && !restoredDb.closed) await restoredDb.close();
});
await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
insert into auth.users values('${alice}'),('${bob}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;
grant select on storage.objects to authenticated,anon;

`);
for (const file of (await readdir("supabase/migrations"))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
}
async function asUser(id = alice) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
  );
}
async function query(sql, params = []) {
  return (await db.query(sql, params)).rows;
}
const date = (
  await query(
    "select (now() at time zone 'America/Sao_Paulo')::date::text as today",
  )
)[0].today;
let project;

test("isolamento, estados e integridade no PostgreSQL", async () => {
  assert.equal(
    (
      await query(
        "select has_table_privilege('authenticated','public.weights','TRUNCATE') as value",
      )
    )[0].value,
    false,
  );
  assert.equal(
    (
      await query(
        "select has_table_privilege('authenticated','public.audit_events','SELECT') as value",
      )
    )[0].value,
    false,
  );
  assert.equal(
    (
      await query(
        "select has_function_privilege('anon','public.create_project(text,date,date,integer,text,numeric,numeric,integer,boolean)','EXECUTE') as value",
      )
    )[0].value,
    false,
  );
  await asUser();
  await assert.rejects(
    query("insert into water_entries(logged_on,volume_ml) values($1,250)", [
      date,
    ]),
    /Nenhum projeto ativo/,
  );
  await assert.rejects(
    query("select create_project('Sem meta',$1)", [date]),
    /meta mensurável/,
  );
  assert.equal(
    (await query("select * from projects")).length,
    0,
    "onboarding inválido deve reverter por inteiro",
  );
  const draft = (
    await query(
      "select create_project('Rascunho',$1,null,null,'none',null,null,null,false) as id",
      [date],
    )
  )[0].id;
  await assert.rejects(
    query(
      "insert into water_entries(project_id,logged_on,volume_ml) values($1,$2,200)",
      [draft, date],
    ),
    /Nenhum projeto ativo/,
  );
  await assert.rejects(
    query("update projects set status='ACTIVE' where id=$1", [draft]),
    /meta mensurável/,
  );
  await query(
    "insert into water_goals(project_id,effective_from,target_ml) values($1,$2,2000)",
    [draft, date],
  );
  await assert.rejects(
    query("update projects set starts_on=$1::date+1 where id=$2", [
      date,
      draft,
    ]),
    /período/,
  );
  await query("update projects set status='ARCHIVED' where id=$1", [draft]);
  await assert.rejects(
    query("update projects set name='Alterado' where id=$1", [draft]),
    /somente leitura/,
  );
  project = (
    await query("select create_project('Jornada',$1,null,2000) as id", [date])
  )[0].id;
  await assert.rejects(
    query("select create_project('Outro',$1,null,2000)", [date]),
    /one_active_per_user/,
  );
  await query(
    "insert into water_entries(logged_on,volume_ml,project_id,user_id) values($1,250,$2,$3)",
    [date, project, bob],
  );
  assert.equal(
    (await query("select user_id from water_entries"))[0].user_id,
    alice,
  );
  await asUser(bob);
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
  ]) {
    assert.equal(
      (await query(`select * from ${table}`)).length,
      0,
      `RLS: ${table}`,
    );
  }
  assert.equal(
    (
      await query("update projects set name=$1 where id=$2 returning id", [
        "Invadido",
        project,
      ])
    ).length,
    0,
  );
  await asUser();
  await query("select save_weight($1,90)", [date]);
  await query("select save_weight($1,89.5)", [date]);
  assert.equal((await query("select kg from weights")).length, 1);
  assert.equal(Number((await query("select kg from weights"))[0].kg), 89.5);
  await query("select save_measurements($1,$2)", [
    date,
    JSON.stringify({ waist: 90, left_arm: 35 }),
  ]);
  await query("select save_measurements($1,$2)", [
    date,
    JSON.stringify({ waist: 89 }),
  ]);
  assert.equal((await query("select * from measurements")).length, 2);
  await assert.rejects(
    query("select save_measurements($1,$2)", [
      date,
      JSON.stringify({ waist: 88, invalid: 1 }),
    ]),
    /check constraint/,
  );
  assert.equal(
    Number(
      (
        await query(
          "select value_cm from measurements where measurement_type='waist'",
        )
      )[0].value_cm,
    ),
    89,
    "subconjunto inválido reverte tudo",
  );
  await assert.rejects(
    query(
      "insert into water_entries(logged_on,volume_ml) values($1::date-1,250)",
      [date],
    ),
    /vigência/,
  );
  await assert.rejects(
    query(
      "insert into water_entries(logged_on,volume_ml) values($1::date+1,250)",
      [date],
    ),
    /vigência/,
  );
  await query("insert into meal_days(logged_on,confirmed) values($1,true)", [
    date,
  ]);
  await query(
    "insert into meal_items(logged_on,category,name,amount,unit,reference_amount,source) values($1,'lunch','Arroz',100,'g',100,'Informado pelo usuário')",
    [date],
  );
  assert.equal(
    (await query("select confirmed from meal_days"))[0].confirmed,
    false,
  );
  assert.equal(
    (await query("select kcal from meal_items"))[0].kcal,
    null,
    "ausente não é zero",
  );
  await query(
    "insert into meal_items(logged_on,category,name,amount,unit,reference_amount,source,kcal,protein) values($1,'lunch','Rótulo',50,'g',100,'Rótulo informado',100,0)",
    [date],
  );
  const summary = (
    await query("select project_summary($1,$2) as value", [project, date])
  )[0].value;
  assert.equal(summary.kcal, 50, "porção proporcional");
  assert.equal(summary.missing_kcal, 1, "subtotal parcial");
  assert.equal(summary.protein, 0, "zero informado é conhecido");
  assert.equal(summary.water_ml, 250);
  assert.equal(summary.sessions, null);
  await asUser(bob);
  assert.equal(
    (await query("select project_summary($1,$2) as value", [project, date]))[0]
      .value,
    null,
    "resumo não vaza dados",
  );
  await asUser();
  await assert.rejects(
    query("select * from audit_events"),
    /permission denied/,
  );
  await query("update projects set status='COMPLETED' where id=$1", [project]);
  await assert.rejects(query("update weights set kg=80"), /somente leitura/);
  await assert.rejects(query("delete from meal_items"), /somente leitura/);
  const next = (
    await query("select create_project('Novo',$1,null,1800) as id", [date])
  )[0].id;
  await query(
    "insert into water_entries(logged_on,volume_ml,project_id) values($1,300,$2)",
    [date, project],
  );
  assert.equal(
    (await query("select project_id from water_entries where volume_ml=300"))[0]
      .project_id,
    next,
    "histórico não define destino",
  );
  await assert.rejects(
    query("select save_weight($1,80)", [date]),
    /somente leitura/,
    "peso de histórico não pode ser transferido",
  );
  await asUser(bob);
  const bobProject = (
    await query(
      "select create_project('Água histórica',$1::date-5,null,2000) as id",
      [date],
    )
  )[0].id;
  await assert.rejects(
    query("update water_goals set target_ml=2500 where project_id=$1", [
      bobProject,
    ]),
    /histórica imutável/,
  );
  await query(
    "insert into water_goals(project_id,effective_from,target_ml) values($1,$2,2500)",
    [bobProject, date],
  );
  assert.equal(
    (
      await query(
        "select target_ml from water_goals where project_id=$1 and effective_from <= $2::date-1 order by effective_from desc limit 1",
        [bobProject, date],
      )
    )[0].target_ml,
    2000,
  );
  await assert.rejects(
    query(
      "update projects set weight_mode='target',weight_min=null where id=$1",
      [bobProject],
    ),
    /check constraint/,
  );
  await asUser();
  const photoId = "00000000-0000-4000-8000-000000000010";
  const path = `${alice}/${next}/${photoId}.webp`;
  await query(
    "insert into photos(id,logged_on,category,storage_key,thumbnail_key) values($1,$2,'front',$3,$4)",
    [photoId, date, path, path.replace(".webp", "-thumb.webp")],
  );
  await db.exec("reset role");
  await query(
    "insert into storage.objects(bucket_id,name) values('body-photos',$1)",
    [path],
  );
  await asUser();
  assert.equal((await query("select * from storage.objects")).length, 1);
  await asUser(bob);
  assert.equal(
    (await query("select * from storage.objects")).length,
    0,
    "storage isolado por proprietário",
  );
  await asUser();
  const expectedProjectCount = (await query("select * from projects")).length;
  const backup = await db.dumpDataDir("gzip");
  await query("select request_account_deletion()");
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
  ])
    assert.equal(
      (await query(`select * from ${table}`)).length,
      0,
      `tombstone: ${table}`,
    );
  await assert.rejects(
    query("insert into water_entries(logged_on,volume_ml) values($1,100)", [
      date,
    ]),
    /Conta indisponível/,
  );
  await db.exec("reset role");
  const audit = await query(
    "select * from audit_events where entity='weights' and action='UPDATE'",
  );
  assert.equal(Number(audit[0].previous_kg), 90);
  // Exclusão administrativa deve funcionar mesmo para projetos encerrados.
  await query("delete from auth.users where id=$1", [alice]);
  assert.equal(
    (await query("select * from projects where user_id=$1", [alice])).length,
    0,
  );
  assert.equal(
    (await query("select * from deletion_ledger where user_id=$1", [alice]))
      .length,
    1,
    "registro mínimo de exclusão sobrevive ao purge",
  );
  await db.close();
  // Ensaio local: restaurar snapshot anterior não pode reabrir dados excluídos.
  const restored = (restoredDb = new PGlite({ loadDataDir: backup }));
  assert.equal(
    (await restored.query("select * from projects where user_id=$1", [alice]))
      .rows.length,
    expectedProjectCount,
  );
  // Reaplicar ledger atual, mantido fora da cópia restaurada, antes de liberar acesso.
  await restored.query(
    "insert into deletion_ledger(user_id) values($1) on conflict do nothing",
    [alice],
  );
  await restored.query(
    "insert into account_deletions(user_id) values($1) on conflict do nothing",
    [alice],
  );
  await restored.query("delete from auth.users where id=$1", [alice]);
  await restored.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false)`,
  );
  assert.equal((await restored.query("select * from projects")).rows.length, 0);
  assert.equal(
    (await restored.query("select * from storage.objects")).rows.length,
    0,
  );
  await restored.close();
});
