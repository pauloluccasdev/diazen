import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  cleanupArchiveWorkspace,
  privateKey,
  keyOutsideDestination,
  run,
  seal,
  publish,
  verifyArchive,
} from "./backup_archive.mjs";
let work, client;
let stage = "configuration";
const unpublished = [];
try {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (existsSync(".env.backup.local")) process.loadEnvFile(".env.backup.local");
  const keyFile = process.env.DIAZEN_BACKUP_KEY_FILE;
  if (!keyFile)
    throw Error("Configure DIAZEN_BACKUP_KEY_FILE em .env.backup.local.");
  const key = await privateKey(keyFile);
  work = await mkdtemp(join(tmpdir(), "diazen-backup-"));
  const args = process.argv.slice(2);
  if (args[0] === "--verify") {
    if (!args[1] || args.length !== 2)
      throw Error("Informe um arquivo em --verify.");
    stage = "verification";
    const verified = await verifyArchive(args[1], work, key);
    console.log(JSON.stringify({ verified: true, ...verified }));
  } else {
    if (args.length && !(args.length === 1 && args[0] === "--ledger"))
      throw Error("Argumentos inválidos.");
    const directory = process.env.DIAZEN_BACKUP_DIR;
    if (!directory) throw Error("Configure DIAZEN_BACKUP_DIR.");
    keyOutsideDestination(keyFile, directory);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const api = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (
      api.protocol !== "https:" ||
      !/^[a-z0-9]+\.supabase\.co$/.test(api.hostname) ||
      !process.env.SUPABASE_SECRET_KEY
    )
      throw Error("Configure o Supabase hospedado antes do backup.");
    const admin = createClient(api.origin, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, init) =>
          fetch(url, { ...init, signal: AbortSignal.timeout(30000) }),
      },
    });
    const ledger = async () => {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const r = await admin
          .from("deletion_ledger")
          .select("user_id,requested_at,purged_at")
          .order("user_id")
          .range(offset, offset + 499);
        if (r.error) throw Error("Não foi possível copiar o ledger atual.");
        rows.push(...(r.data ?? []));
        if (!r.data || r.data.length < 500) break;
      }
      return rows;
    };
    let snapshot;
    if (args[0] !== "--ledger") {
      const database = new URL(process.env.DIAZEN_BACKUP_DATABASE_URL ?? ""),
        ref = api.hostname.split(".")[0];
      const direct = database.hostname === `db.${ref}.supabase.co`;
      const pooler =
        /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(database.hostname) &&
        decodeURIComponent(database.username).endsWith("." + ref) &&
        (database.port || "5432") === "5432";
      if (
        !["postgres:", "postgresql:"].includes(database.protocol) ||
        (!direct && !pooler) ||
        database.pathname !== "/postgres"
      )
        throw Error(
          "Use a conexão direta ou pooler de sessão do mesmo projeto.",
        );
      const caFile = process.env.DIAZEN_BACKUP_CA_FILE,
        bin = process.env.PG_BIN_DIR;
      if (!caFile || !bin)
        throw Error("Configure DIAZEN_BACKUP_CA_FILE e PG_BIN_DIR.");
      const ca = await readFile(caFile, "utf8");
      client = new Client({
        host: database.hostname,
        port: Number(database.port || "5432"),
        user: decodeURIComponent(database.username),
        password: decodeURIComponent(database.password),
        database: "postgres",
        ssl: { ca, rejectUnauthorized: true },
        connectionTimeoutMillis: 15000,
        query_timeout: 30000,
      });
      client.on("error", () => {}); // Falhas são tratadas nas operações, sem imprimir configuração.
      stage = "database_snapshot";
      await client.connect();
      await client.query("begin isolation level repeatable read read only");
      const exported = (
        await client.query("select pg_export_snapshot() as snapshot")
      ).rows[0].snapshot;
      const photos = (
        await client.query(
          "select storage_key,thumbnail_key from public.photos order by id",
        )
      ).rows;
      const deletions = (
        await client.query(
          "select user_id,requested_at,purged_at from public.deletion_ledger order by user_id",
        )
      ).rows;
      const version = (await client.query("select version() as version"))
        .rows[0].version;
      const migrations = (
        await client.query(
          "select version,name from supabase_migrations.schema_migrations order by version",
        )
      ).rows;
      const data = join(work, "snapshot");
      await mkdir(join(data, "images"), { recursive: true, mode: 0o700 });
      const schemas = [
        "public",
        "private",
        "auth",
        "storage",
        "supabase_migrations",
      ];
      const env = {
        PATH: process.env.PATH,
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH ?? "",
        PGHOST: database.hostname,
        PGPORT: database.port || "5432",
        PGUSER: decodeURIComponent(database.username),
        PGPASSWORD: decodeURIComponent(database.password),
        PGDATABASE: "postgres",
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: resolve(caFile),
        PGCONNECT_TIMEOUT: "15",
      };
      run(
        join(bin, "pg_dump"),
        [
          "-Fc",
          "--lock-wait-timeout=15s",
          "--snapshot=" + exported,
          ...schemas.map((s) => "--schema=" + s),
          "-f",
          join(data, "database.dump"),
        ],
        { env },
      );
      run(
        join(bin, "pg_restore"),
        ["--file", "/dev/null", join(data, "database.dump")],
        { env },
      );
      await client.query("commit");
      await client.end();
      client = null;
      await writeFile(
        join(data, "deletion-ledger.json"),
        JSON.stringify(deletions),
        { mode: 0o600 },
      );
      const files = [
        { path: "database.dump" },
        { path: "deletion-ledger.json" },
      ];
      stage = "storage_files";
      for (const photo of photos)
        for (const storageKey of [photo.storage_key, photo.thumbnail_key]) {
          if (
            !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}(-thumb)?\.webp$/.test(
              storageKey,
            )
          )
            throw Error("Caminho de foto inesperado; backup cancelado.");
          const r = await admin.storage
            .from("body-photos")
            .download(storageKey);
          if (r.error || !r.data)
            throw Error(
              "Foto indisponível durante a cópia; repita o backup. Nenhuma cópia incompleta será publicada.",
            );
          const path = `images/${files.length - 2}.webp`;
          await writeFile(
            join(data, path),
            Buffer.from(await r.data.arrayBuffer()),
            { mode: 0o600 },
          );
          files.push({ path, storage_key: storageKey });
        }
      stage = "snapshot_encryption";
      snapshot = await seal(data, work, directory, key, {
        kind: "snapshot",
        created_at: new Date().toISOString(),
        schemas,
        postgres_version: version,
        migrations,
        files,
      });
      unpublished.push(snapshot.partial);
    }
    stage = "current_ledger";
    const data = join(work, "ledger");
    await mkdir(data, { mode: 0o700 });
    await writeFile(
      join(data, "deletion-ledger.json"),
      JSON.stringify(await ledger()),
      { mode: 0o600 },
    );
    const current = await seal(data, work, directory, key, {
      kind: "ledger",
      created_at: new Date().toISOString(),
      files: [{ path: "deletion-ledger.json" }],
    });
    unpublished.push(current.partial);
    // O ledger atualizado é publicado antes do snapshot mais antigo.
    const ledgerCopy = await publish(current),
      snapshotCopy = snapshot ? await publish(snapshot) : null;
    console.log(
      JSON.stringify({
        completedAt: new Date().toISOString(),
        encrypted: true,
        verified: true,
        ledger: ledgerCopy,
        snapshot: snapshotCopy,
        remoteWrites: false,
        automaticPruning: false,
      }),
    );
  }
} catch {
  console.error(
    JSON.stringify({
      stage,
      message:
        "Não foi possível concluir ou verificar o backup. Confira configuração, permissões, conexão e ferramentas. Nenhum segredo foi exibido; arquivos parciais serão removidos.",
    }),
  );
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  }
  for (const file of unpublished)
    await rm(file, { force: true }).catch(() => {});
  if (work) {
    try {
      cleanupArchiveWorkspace(work);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}
