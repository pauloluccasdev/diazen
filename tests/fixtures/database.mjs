import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

export async function createDatabase(users) {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth,public to authenticated,anon;
  grant execute on function auth.uid() to authenticated,anon;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated,anon; grant select on storage.objects to authenticated,anon;`);
  for (const id of users)
    await db.query("insert into auth.users values($1)", [id]);
  for (const file of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  return db;
}

const tables = new Set([
  "projects",
  "water_goals",
  "water_entries",
  "weights",
  "measurements",
  "activities",
  "meal_items",
  "meal_days",
  "food_library",
  "diet_plans",
  "food_copy_requests",
  "photos",
  "photo_cleanup",
  "account_deletions",
  "deletion_ledger",
]);
const commands = new Set([
  "register_meal",
  "create_project",
  "save_weight",
  "save_measurements",
  "account_available",
  "request_account_deletion",
  "project_summary",
  "food_calendar",
  "save_recipe",
  "add_library_food",
  "copy_meal",
]);
const identifier = (text) => {
  if (!/^[a-z_]+$/.test(text)) throw new Error("Invalid identifier");
  return `"${text}"`;
};
// Adaptador REST de teste: a persistência, constraints e RLS são PostgreSQL real.
export async function rest(
  db,
  request,
  response,
  url,
  userId,
  admin = false,
  failPhotoReply = () => false,
) {
  let payload = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    let raw = "";
    for await (const part of request) raw += part;
    payload = raw ? JSON.parse(raw) : null;
  }
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userId ?? "",
  ]);
  if (!admin) await db.exec("set role authenticated");
  const table = url.pathname.split("/").at(-1);
  let rows;
  try {
    if (url.pathname.includes("/rpc/")) {
      if (!commands.has(table)) throw new Error("Unknown RPC");
      const params = Object.entries(payload ?? {});
      const args = params
        .map(([key], i) => `${identifier(key)} => $${i + 1}`)
        .join(",");
      if (table === "food_calendar") {
        rows = (
          await db.query(
            `select * from public.${identifier(table)}(${args})`,
            params.map(([, v]) => v),
          )
        ).rows;
        response.end(
          JSON.stringify(
            rows.map((row) => ({
              ...row,
              day:
                row.day instanceof Date
                  ? row.day.toISOString().slice(0, 10)
                  : row.day,
            })),
          ),
        );
        return;
      }
      rows = (
        await db.query(
          `select public.${identifier(table)}(${args}) as result`,
          params.map(([, v]) =>
            typeof v === "object" && v !== null ? JSON.stringify(v) : v,
          ),
        )
      ).rows;
      response.end(JSON.stringify(rows[0]?.result ?? null));
      return;
    }
    if (!tables.has(table)) throw new Error("Unknown table");
    const values = [];
    const filters = [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "offset", "on_conflict"].includes(key))
        continue;
      const match = /^(eq|gte|lte|gt|lt|ilike)\.(.*)$/.exec(value);
      if (!match) throw new Error("Unknown filter");
      values.push(match[2]);
      filters.push(
        `${identifier(key)} ${{ eq: "=", gte: ">=", lte: "<=", gt: ">", lt: "<", ilike: "ilike" }[match[1]]} $${values.length}`,
      );
    }
    const where = filters.length ? " where " + filters.join(" and ") : "";
    let sql;
    if (request.method === "GET" || request.method === "HEAD") {
      const order = (url.searchParams.get("order") ?? "")
        .split(",")
        .filter(Boolean)
        .map((s) => {
          const [key, direction] = s.split(".");
          return `${identifier(key)} ${direction === "desc" ? "desc" : "asc"}`;
        })
        .join(",");
      const limit = Number(url.searchParams.get("limit") ?? 1000),
        offset = Number(url.searchParams.get("offset") ?? 0);
      sql = `select * from public.${identifier(table)}${where}${order ? " order by " + order : ""} limit ${Math.min(limit, 1000)} offset ${offset}`;
    } else if (request.method === "POST") {
      const pairs = Object.entries(payload);
      values.length = 0;
      sql = `insert into public.${identifier(table)}(${pairs.map(([k]) => identifier(k)).join(",")}) values(${pairs
        .map(([, v], i) => {
          values.push(v);
          return "$" + (i + 1);
        })
        .join(",")})`;
      const conflict = url.searchParams.get("on_conflict");
      if (conflict)
        sql += ` on conflict(${conflict.split(",").map(identifier).join(",")}) do update set ${pairs
          .filter(([k]) => !conflict.split(",").includes(k))
          .map(([k]) => `${identifier(k)}=excluded.${identifier(k)}`)
          .join(",")}`;
      sql += " returning *";
    } else if (request.method === "PATCH") {
      const assignments = Object.entries(payload).map(([key, value]) => {
        values.push(value);
        return `${identifier(key)}=$${values.length}`;
      });
      sql = `update public.${identifier(table)} set ${assignments.join(",")}${where} returning *`;
    } else if (request.method === "DELETE")
      sql = `delete from public.${identifier(table)}${where} returning *`;
    else throw new Error("Unsupported method");
    rows = (await db.query(sql, values)).rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value instanceof Date &&
          (key.endsWith("_on") || key === "effective_from")
            ? value.toISOString().slice(0, 10)
            : value,
        ]),
      ),
    );
    if (table === "photos" && request.method === "POST" && failPhotoReply()) {
      response.statusCode = 503;
      response.end(
        JSON.stringify({
          code: "TEST_REPLY_LOST",
          message: "Resposta de teste indisponível após commit",
        }),
      );
      return;
    }
    response.setHeader(
      "Content-Range",
      `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
    );
    const single = String(request.headers.accept).includes(
      "application/vnd.pgrst.object+json",
    );
    if (single && rows.length !== 1) {
      response.statusCode = 406;
      response.end(
        JSON.stringify({ code: "PGRST116", message: "Not exactly one row" }),
      );
      return;
    }
    response.end(JSON.stringify(single ? rows[0] : rows));
  } catch (error) {
    response.statusCode = 400;
    response.end(
      JSON.stringify({ code: error.code ?? "P0001", message: error.message }),
    );
  } finally {
    await db.exec("reset role");
  }
}
