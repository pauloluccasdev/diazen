import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { purgeAccount } from "../../src/lib/privacy.ts";
// Laboratório novo a cada execução. Não lê .env.local e não aceita URLs remotas.
const bin = process.env.PG_BIN_DIR ? resolve(process.env.PG_BIN_DIR) : null;
if (!bin || !existsSync(join(bin, "pg_dump")))
  throw Error("Configure PG_BIN_DIR com as ferramentas PostgreSQL 17.");
const root = mkdtempSync(join(tmpdir(), "diazen-supabase-restore-"));
const home = resolve("artifacts", "supabase-native-lab-home");
mkdirSync(home, { recursive: true, mode: 0o700 });
chmodSync(home, 0o700);
mkdirSync(root + "/supabase", { mode: 0o700 });
cpSync("supabase/migrations", root + "/supabase/migrations", {
  recursive: true,
});
writeFileSync(
  root + "/supabase/config.toml",
  'project_id = "diazen-restore-isolated"\n[experimental]\nstack = true\n[db]\nmajor_version = 17\n',
  { mode: 0o600 },
);
const cliEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  LANG: "C.UTF-8",
  SUPABASE_HOME: home,
  SUPABASE_EXPERIMENTAL_STACK: "1",
};
function cli(args) {
  const r = spawnSync(
    "npx",
    ["--offline", "supabase@2.121.0", "--workdir", root, "stack", ...args],
    {
      env: cliEnv,
      encoding: "utf8",
      timeout: 600000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (r.status !== 0)
    throw Error(
      `Supabase CLI ${args[0]} falhou (código ${r.status ?? "timeout"}).`,
    );
  return r.stdout;
}
let passed = false,
  cleaned = false,
  failure = null,
  postgresVersion = null;
const phases = [];
try {
  cli([
    "start",
    "--runtime",
    "native",
    "--exclude",
    "studio,mail,analytics,pooler,functions,realtime",
    "--eager",
  ]);
  const status = JSON.parse(cli(["status", "--output-format", "json"]));
  const api = new URL(status.env.API_URL),
    dbUrl = new URL(status.env.DB_URL);
  assert.equal(status.runtime, "native");
  assert.equal(status.readiness, "ready");
  assert.equal(status.identity.project_root, root);
  for (const url of [api, dbUrl])
    assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  const archive = root + "/backup";
  mkdirSync(archive, { mode: 0o700 });
  const env = {
    PATH: process.env.PATH,
    LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ?? "",
    PGHOST: dbUrl.hostname,
    PGPORT: dbUrl.port,
    PGUSER: "supabase_admin",
    PGPASSWORD: decodeURIComponent(dbUrl.password),
    PGDATABASE: dbUrl.pathname.slice(1),
    PGSSLMODE: "disable",
  };
  function command(name, args, input) {
    const r = spawnSync(bin + "/" + name, args, {
      env,
      input,
      encoding: "utf8",
      timeout: 60000,
    });
    if (r.status !== 0)
      throw Error(name + " falhou (código " + (r.status ?? "timeout") + ").");
    return r.stdout.trim();
  }
  const sql = (q) =>
    command("psql", ["-X", "-qAt", "--set", "ON_ERROR_STOP=1", "-c", q]);
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  };
  const admin = createClient(api.href, status.env.SECRET_KEY, options),
    client = () => createClient(api.href, status.env.PUBLISHABLE_KEY, options);
  const check = async (p) => {
    const r = await p;
    if (r.error)
      throw Error(
        "Serviço Supabase indisponível: " +
          (r.error.code ?? r.error.status ?? "erro"),
      );
    return r.data;
  };
  const users = [],
    files = [];
  const mark = (p) => {
    phases.push(p);
    console.log(JSON.stringify({ passed: p }));
  };
  assert.equal(
    sql("select count(*) from auth.users;"),
    "0",
    "Laboratório deve estar vazio",
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  for (let i = 0; i < 2; i++) {
    const email = `restore-${randomUUID()}@example.invalid`,
      password = randomBytes(32).toString("base64url");
    const data = await check(
      admin.auth.admin.createUser({ email, password, email_confirm: true }),
    );
    const c = client();
    await check(c.auth.signInWithPassword({ email, password }));
    const id = data.user.id,
      project = await check(
        c.rpc("create_project", {
          p_name: "Ensaio isolado " + i,
          p_starts_on: today,
          p_water_ml: 2000,
        }),
      );
    users.push({ id, email, password, c, project });
    await check(
      c.from("water_entries").insert({ logged_on: today, volume_ml: 300 }),
    );
    await check(c.rpc("save_weight", { p_date: today, p_kg: 80 }));
    const photo = randomUUID(),
      key = `${id}/${project}/${photo}.webp`,
      thumb = `${id}/${project}/${photo}-thumb.webp`;
    for (const [path, width, height] of [
      [key, 32, 48],
      [thumb, 8, 12],
    ]) {
      const bytes = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: i ? "#FF9F24" : "#191C22",
        },
      })
        .webp()
        .toBuffer();
      await check(
        admin.storage
          .from("body-photos")
          .upload(path, bytes, { contentType: "image/webp" }),
      );
      const download = await check(
        admin.storage.from("body-photos").download(path),
      );
      const backup = Buffer.from(await download.arrayBuffer()),
        filename = archive + `/file-${files.length}.webp`;
      writeFileSync(filename, backup, { mode: 0o600 });
      files.push({
        path,
        owner: id,
        filename,
        sha256: createHash("sha256").update(backup).digest("hex"),
      });
    }
    await check(
      c.from("photos").insert({
        id: photo,
        logged_on: today,
        category: "front",
        storage_key: key,
        thumbnail_key: thumb,
      }),
    );
  }
  mark("real_auth_domain_and_storage_seeded");
  command("pg_dump", [
    "-Fc",
    "--schema=public",
    "--schema=private",
    "--schema=auth",
    "--schema=storage",
    "--schema=supabase_migrations",
    "-f",
    archive + "/database.dump",
  ]);
  command("pg_restore", ["--list", archive + "/database.dump"]);
  mark("native_dump_and_separate_storage_api_backup");
  const [alice, bob] = users;
  await check(alice.c.rpc("request_account_deletion"));
  const ledger = await check(
    admin.from("deletion_ledger").select("*").eq("user_id", alice.id).single(),
  );
  writeFileSync(
    archive + "/current-deletion-ledger.json",
    JSON.stringify([ledger]),
    { mode: 0o600 },
  );
  await purgeAccount(admin, alice.id);
  // Somente dados gerados por este ensaio no laboratório exclusivo.
  await check(
    admin.storage
      .from("body-photos")
      .remove(files.filter((f) => f.owner === bob.id).map((f) => f.path)),
  );
  await check(admin.auth.admin.deleteUser(bob.id));
  assert.equal(sql("select count(*) from auth.users;"), "0");
  mark("post_backup_deletion_ledger_preserved_and_lab_data_cleared");
  command("pg_restore", [
    "--clean",
    "--if-exists",
    "--single-transaction",
    "--exit-on-error",
    "-d",
    env.PGDATABASE,
    archive + "/database.dump",
  ]);
  assert.equal(sql("select count(*) from auth.users;"), "2");
  assert.equal(sql("select count(*) from public.projects;"), "2");
  assert.equal(sql("select count(*) from public.photos;"), "2");
  // Bloqueio reaplicado antes de habilitar qualquer acesso de usuário à cópia.
  const quote = (v) => "'" + v.replaceAll("'", "''") + "'";
  sql(
    `insert into public.deletion_ledger(user_id,requested_at) values(${quote(alice.id)},${quote(ledger.requested_at)});insert into public.account_deletions(user_id) values(${quote(alice.id)});notify pgrst,'reload schema';`,
  );
  cli(["restart"]);
  assert.equal((await check(alice.c.from("projects").select("id"))).length, 0);
  mark("real_database_auth_restored_and_tombstone_replayed");
  for (const file of files)
    await check(
      admin.storage
        .from("body-photos")
        .upload(file.path, readFileSync(file.filename), {
          contentType: "image/webp",
          upsert: true,
        }),
    );
  assert.ok(
    (
      await alice.c.storage
        .from("body-photos")
        .download(files.find((f) => f.owner === alice.id).path)
    ).error,
    "Tombstone bloqueia a foto mesmo depois de restaurar seus bytes",
  );
  const crossOwner = client();
  await check(
    crossOwner.auth.signInWithPassword({
      email: bob.email,
      password: bob.password,
    }),
  );
  assert.ok(
    (
      await crossOwner.storage
        .from("body-photos")
        .download(files.find((f) => f.owner === alice.id).path)
    ).error,
  );
  await purgeAccount(admin, alice.id);
  mark("real_storage_api_restored_then_deleted_owner_purged");
  const restoredBob = client();
  await check(
    restoredBob.auth.signInWithPassword({
      email: bob.email,
      password: bob.password,
    }),
  );
  assert.equal(
    (await check(restoredBob.from("projects").select("id"))).length,
    1,
  );
  const summary = await check(
    restoredBob.rpc("project_summary", {
      p_project: bob.project,
      p_date: today,
    }),
  );
  assert.equal(summary.water_ml, 300);
  assert.equal(summary.weight, 80);
  for (const file of files.filter((f) => f.owner === bob.id)) {
    const object = await check(
      restoredBob.storage.from("body-photos").download(file.path),
    );
    assert.equal(
      createHash("sha256")
        .update(Buffer.from(await object.arrayBuffer()))
        .digest("hex"),
      file.sha256,
    );
  }
  const deleted = await admin.auth.admin.getUserById(alice.id);
  assert.equal(deleted.error?.code, "user_not_found");
  assert.equal(
    (await check(admin.storage.from("body-photos").list(alice.id))).length,
    0,
  );
  assert.ok(
    (
      await restoredBob.storage
        .from("body-photos")
        .download(files.find((f) => f.owner === alice.id).path)
    ).error,
  );
  assert.ok(
    (
      await client()
        .storage.from("body-photos")
        .download(files.find((f) => f.owner === bob.id).path)
    ).error,
  );
  assert.equal(
    sql(
      "select count(*) from pg_tables where schemaname='public' and not rowsecurity;",
    ),
    "0",
  );
  assert.equal(
    (await check(admin.storage.getBucket("body-photos"))).public,
    false,
  );
  assert.equal(
    (
      await check(
        admin
          .from("deletion_ledger")
          .select("purged_at")
          .eq("user_id", alice.id)
          .single(),
      )
    ).purged_at !== null,
    true,
  );
  mark(
    "restored_password_login_rls_private_bucket_checksums_and_erasure_verified",
  );
  postgresVersion = sql("select version();");
  passed = true;
} catch (e) {
  failure = e.message;
} finally {
  try {
    cli(["destroy", "--yes"]);
    rmSync(root, { recursive: true, force: true });
    cleaned = true;
  } catch {
    failure ??=
      "Não foi possível remover o laboratório; confira os processos locais antes de repetir.";
  }
}
const report = {
  completedAt: new Date().toISOString(),
  passed: passed && cleaned,
  syntheticOnly: true,
  remoteProjectTouched: false,
  realAuthService: phases.includes("real_auth_domain_and_storage_seeded"),
  realStorageApi: phases.includes("real_auth_domain_and_storage_seeded"),
  hostedServicesRestoreTested: false,
  nativePgDumpRestore: phases.includes(
    "real_database_auth_restored_and_tombstone_replayed",
  ),
  remainingFilesVerified: passed ? 2 : 0,
  deletionLedgerReplayed: passed,
  labDestroyed: cleaned,
  postgresVersion,
  phases,
  error: failure,
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/supabase-services-restore-report.json",
  JSON.stringify(report, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
