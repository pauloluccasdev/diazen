import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "./supabase/admin")
      return {
        url: "data:text/javascript,export function createAdminClient(){return globalThis.__sleepAdmin}",
        shortCircuit: true,
      };
    const path =
      specifier.startsWith(".") && context.parentURL?.includes("/src/")
        ? new URL(specifier + ".ts", context.parentURL)
        : null;
    if (path && existsSync(fileURLToPath(path)))
      return { url: path.href, shortCircuit: true };
    return next(specifier, context);
  },
});
const { syncGarminSleep } = await import("../../src/lib/garmin-sleep-sync.ts");
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
let claim, finish, saved, fetches, rows, failure;
beforeEach(() => {
  process.env.GARMIN_PERSONAL_API_KEY = "synthetic";
  process.env.GARMIN_OWNER_USER_ID = "owner";
  claim = { lease: "lease", from: date, to: date };
  finish = [];
  saved = [];
  fetches = 0;
  failure = false;
  rows = [
    {
      calendarDate: date,
      sleepTimeSeconds: 27000,
      sleepScores: { overall: { value: 82 } },
    },
  ];
  globalThis.__sleepAdmin = {
    async rpc(name, args) {
      if (name === "garmin_claim_sleep") return { data: claim };
      if (name === "garmin_store_sleep") {
        saved.push(args);
        return { data: true };
      }
      if (name === "garmin_finish_sleep") {
        finish.push(args);
        return { error: null };
      }
      throw Error("Unexpected RPC");
    },
  };
  globalThis.fetch = async (url) => {
    fetches++;
    if (failure) return new Response("private-error", { status: 500 });
    return String(url).includes("personal-api-key/token")
      ? new Response("a.b.c")
      : Response.json(rows);
  };
});
test("sem claim não consulta provedor nem grava", async () => {
  claim = null;
  assert.deepEqual(await syncGarminSleep("owner"), {
    updated: 0,
    checked: false,
  });
  assert.equal(fetches, 0);
  assert.equal(saved.length, 0);
});
test("sincroniza apenas a conta configurada, minimiza dados e conclui lease", async () => {
  await assert.rejects(() => syncGarminSleep("other"));
  assert.equal(fetches, 0);
  assert.deepEqual(await syncGarminSleep("owner"), {
    updated: 1,
    checked: true,
  });
  assert.equal(saved[0].p_user, "owner");
  assert.equal(saved[0].p_lease, "lease");
  assert.equal(saved[0].p_data.total_seconds, 27000);
  assert.equal(saved[0].p_data.score, 82);
  assert.equal(finish[0].p_success, true);
});
test("resposta sem dados conclui busca sem inventar registro", async () => {
  rows = [];
  assert.deepEqual(await syncGarminSleep("owner"), {
    updated: 0,
    checked: true,
  });
  assert.equal(saved.length, 0);
  assert.equal(finish[0].p_success, true);
});
test("falha libera lease sem gravar nem apagar dados anteriores", async () => {
  failure = true;
  await assert.rejects(() => syncGarminSleep("owner"));
  assert.equal(saved.length, 0);
  assert.equal(finish[0].p_success, false);
});
