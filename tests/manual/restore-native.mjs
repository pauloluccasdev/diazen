import { spawnSync } from "node:child_process";
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  rmSync,
  mkdtempSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir, userInfo } from "node:os";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
// Não lê .env.local nem aceita URLs remotas. Requer ferramentas PostgreSQL 17 locais.
const bin = process.env.PG_BIN_DIR ? resolve(process.env.PG_BIN_DIR) : null;
if (!bin || !existsSync(join(bin, "initdb")))
  throw Error(
    "Configure PG_BIN_DIR com o diretório das ferramentas PostgreSQL 17.",
  );
const share = process.env.PG_SHARE_DIR;
const work = mkdtempSync(join(tmpdir(), "diazen-restore-"));
mkdirSync(work + "/socket", { mode: 0o700 });
const env = {
  PATH: process.env.PATH,
  LANG: "C",
  LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ?? "",
  PGHOST: work + "/socket",
  PGPORT: "55432",
  PGUSER: userInfo().username,
  PGDATABASE: "postgres",
};
let started = false;
// Todas as conexões são pelo socket privado do laboratório; nenhuma URL remota.
function command(name, args, sql) {
  const r = spawnSync(bin + "/" + name, args, {
    env,
    encoding: "utf8",
    input: sql,
    timeout: 60000,
  });
  if (r.status !== 0) throw Error(name + " failed: " + r.stderr.slice(0, 1200));
  return r.stdout.trim();
}
function sql(db, input) {
  return command(
    "psql",
    ["-X", "--set", "ON_ERROR_STOP=1", "-qAt", "-d", db],
    (db === "postgres" ? "" : "set role postgres;") + input,
  );
}
const source = "diazen_restore_source",
  destination = "diazen_restore_target";
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
const schema = `create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated,anon;grant select on storage.objects to authenticated,anon;`;
try {
  command("initdb", [
    "-D",
    work + "/data",
    ...(share ? ["-L", resolve(share)] : []),
    "--auth-local=trust",
    "--auth-host=reject",
    "--no-locale",
    "--encoding=UTF8",
  ]);
  command("pg_ctl", [
    "-D",
    work + "/data",
    "-l",
    work + "/server.log",
    "-o",
    `-k ${work}/socket -h '' -p 55432`,
    "start",
  ]);
  started = true;
  sql(
    "postgres",
    `do $$begin if not exists(select 1 from pg_roles where rolname='postgres') then create role postgres superuser;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;create role anon;create role service_role bypassrls;end if;end$$;`,
  );
  command("createdb", [source]);
  command("createdb", [destination]);
  sql(source, schema);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sql(source, readFileSync("supabase/migrations/" + file, "utf8"));
  sql(source, `insert into auth.users values('${alice}'),('${bob}');`);
  const today = sql(
    source,
    "select (now() at time zone 'America/Sao_Paulo')::date::text;",
  );
  const ids = [];
  for (const owner of [alice, bob])
    ids.push(
      sql(
        source,
        `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);select create_project('Ensaio sintético','${today}',null,2000);`,
      )
        .split("\n")
        .at(-1),
    );
  for (let i = 0; i < 2; i++) {
    const owner = [alice, bob][i],
      project = ids[i],
      photo =
        i === 0
          ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
          : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    sql(
      source,
      `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);insert into water_entries(logged_on,volume_ml) values('${today}',300);select save_weight('${today}',80);insert into photos(id,logged_on,category,storage_key,thumbnail_key) values('${photo}','${today}','front','${owner}/${project}/${photo}.webp','${owner}/${project}/${photo}-thumb.webp');`,
    );
  }
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 32, height: 48, channels: 3, background: "#FF9F24" },
  })
    .webp()
    .toBuffer();
  const hash = createHash("sha256").update(bytes).digest("hex");
  for (let i = 0; i < 2; i++) {
    const owner = [alice, bob][i],
      photo =
        i === 0
          ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
          : "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const dir = work + "/source-files/" + owner + "/" + ids[i];
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    for (const name of [photo + ".webp", photo + "-thumb.webp"])
      writeFileSync(dir + "/" + name, bytes, { mode: 0o600 });
    sql(
      source,
      `insert into storage.objects(bucket_id,name) values('body-photos','${owner}/${ids[i]}/${photo}.webp'),('body-photos','${owner}/${ids[i]}/${photo}-thumb.webp');`,
    );
  }
  command("pg_dump", ["-Fc", "-d", source, "-f", work + "/synthetic.dump"]);
  cpSync(work + "/source-files", work + "/backup-files", { recursive: true });
  command("pg_restore", [
    "--exit-on-error",
    "--role=postgres",
    "-d",
    destination,
    work + "/synthetic.dump",
  ]);
  cpSync(work + "/backup-files", work + "/restored-files", { recursive: true });
  assert.equal(sql(destination, "select count(*) from public.projects;"), "2");
  assert.equal(sql(destination, "select count(*) from public.photos;"), "2");
  assert.equal(sql(destination, "select count(*) from public.weights;"), "2");
  assert.equal(
    sql(destination, "select sum(volume_ml) from public.water_entries;"),
    "600",
  );
  assert.equal(
    sql(
      destination,
      "select public from storage.buckets where id='body-photos';",
    ),
    "f",
  );
  const ledger = JSON.parse(
    sql(
      source,
      `set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);select request_account_deletion();reset role;select row_to_json(d) from deletion_ledger d where user_id='${alice}';`,
    )
      .split("\n")
      .filter(Boolean)
      .at(-1),
  );
  writeFileSync(
    work + "/current-deletion-ledger.json",
    JSON.stringify([ledger]),
    { mode: 0o600 },
  );
  sql(
    destination,
    `insert into deletion_ledger(user_id,requested_at) values('${alice}','${ledger.requested_at}');insert into account_deletions(user_id) values('${alice}');`,
  );
  assert.equal(
    sql(
      destination,
      `set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);select count(*) from projects;`,
    )
      .split("\n")
      .at(-1),
    "0",
  );
  // Reaplicar exclusão antes de liberar a cópia. Arquivos são externos ao dump.
  rmSync(work + "/restored-files/" + alice, { recursive: true });
  sql(
    destination,
    `delete from storage.objects where name like '${alice}/%';set role postgres;delete from auth.users where id='${alice}';reset role;update deletion_ledger set purged_at=now() where user_id='${alice}';delete from photo_cleanup where user_id='${alice}';`,
  );
  assert.equal(sql(destination, "select count(*) from public.projects;"), "1");
  assert.equal(sql(destination, "select count(*) from public.photos;"), "1");
  assert.equal(sql(destination, "select count(*) from storage.objects;"), "2");
  assert.equal(sql(destination, "select count(*) from public.weights;"), "1");
  assert.equal(
    sql(destination, "select sum(volume_ml) from public.water_entries;"),
    "300",
  );
  assert.equal(
    sql(
      destination,
      "select count(*) from deletion_ledger where purged_at is not null;",
    ),
    "1",
  );
  assert.equal(
    sql(
      destination,
      "select count(*) from pg_tables where schemaname='public' and not rowsecurity;",
    ),
    "0",
  );
  const own = sql(
    destination,
    `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);select count(*) from projects;`,
  )
    .split("\n")
    .at(-1);
  assert.equal(own, "1");
  const foreign = sql(
    destination,
    `set role authenticated;select set_config('request.jwt.claim.sub','${bob}',false);select count(*) from projects where user_id='${alice}';`,
  )
    .split("\n")
    .at(-1);
  assert.equal(foreign, "0");
  const files = readdirSync(work + "/restored-files/" + bob + "/" + ids[1]);
  for (const file of files)
    assert.equal(
      createHash("sha256")
        .update(
          readFileSync(
            work + "/restored-files/" + bob + "/" + ids[1] + "/" + file,
          ),
        )
        .digest("hex"),
      hash,
    );
  const report = {
    completedAt: new Date().toISOString(),
    postgresVersion: command("postgres", ["--version"]),
    nativePgDumpRestore: true,
    isolatedUnixSocket: true,
    syntheticOnly: true,
    remoteDatabaseTouched: false,
    authStorageSchemas: "test adapters, not hosted services",
    externalFileBackupRestore: "local filesystem, not Storage API",
    projectsBefore: 2,
    projectsAfterDeletionReplay: 1,
    remainingFilesVerified: files.length,
    rlsAfterRestore: true,
    deletionLedgerReplay: true,
    storageApiRestoreTested: false,
  };
  mkdirSync(resolve("artifacts"), { recursive: true });
  writeFileSync(
    resolve("artifacts/native-restore-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(JSON.stringify(report));
} finally {
  if (started)
    command("pg_ctl", ["-D", work + "/data", "-m", "immediate", "stop"]);
  rmSync(work, { recursive: true, force: true });
}
