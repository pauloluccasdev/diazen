import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "./supabase/admin")
      return {
        url: "data:text/javascript,export function createAdminClient(){return globalThis.__garminAdmin}",
        shortCircuit: true,
      };
    const target =
      specifier.startsWith(".") && context.parentURL?.includes("/src/")
        ? new URL(specifier + ".ts", context.parentURL)
        : null;
    if (target && existsSync(fileURLToPath(target)))
      return { url: target.href, shortCircuit: true };
    return next(specifier, context);
  },
});
const { syncGarmin } = await import("../../src/lib/garmin-sync.ts");
const current = new Date(Date.now() - 60000)
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");
const old = new Date(Date.now() - 86400000)
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");
const item = (id, gmt = current) => ({
  activityId: id,
  activityName: "Treino fictício",
  activityType: { typeKey: "strength_training" },
  duration: 1200,
  distance: 0,
  calories: 0,
  startTimeLocal: gmt,
  startTimeGMT: gmt,
});
let calls, records, finish, claim;
beforeEach(() => {
  process.env.GARMIN_PERSONAL_API_KEY = "synthetic-key";
  process.env.GARMIN_OWNER_USER_ID = "owner";
  calls = 0;
  records = [];
  finish = null;
  claim = {
    lease: "synthetic-lease",
    after: new Date(Date.now() - 3600000).toISOString(),
    offset: 0,
  };
  globalThis.__garminAdmin = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      async in() {
        return { data: [], error: null };
      },
    }),
    rpc: async (name, args) => {
      if (name === "garmin_claim_sync") return { data: claim, error: null };
      if (name === "garmin_finish_sync") {
        finish = args;
        return { error: null };
      }
      if (name === "garmin_import_activity") {
        records.push(args);
        return { data: { status: "imported" }, error: null };
      }
      throw Error("Unexpected RPC");
    },
  };
  globalThis.fetch = async (url) => {
    calls++;
    return String(url).includes("personalapitoken")
      ? new Response("synthetic.access.signature")
      : Response.json([item(1), item(2, old)]);
  };
});
test("sincroniza apenas atividades novas e usa classificação e identidade do servidor", async () => {
  const result = await syncGarmin("owner");
  assert.equal(result.imported, 1);
  assert.equal(calls, 2);
  assert.equal(records.length, 1);
  assert.equal(records[0].p_user, "owner");
  assert.equal(records[0].p_lease, "synthetic-lease");
  assert.equal(records[0].p_data.modality, "strength");
  assert.equal(records[0].p_data.calories, 0);
  assert.equal(finish.p_success, true);
  assert.equal(finish.p_offset, 0);
});
test("paginação limitada salva cursor para continuar sem truncar o histórico", async () => {
  claim.offset = 100;
  globalThis.fetch = async (url) =>
    String(url).includes("personalapitoken")
      ? new Response("synthetic.access.signature")
      : Response.json(
          Array.from({ length: 100 }, (_, i) =>
            item(Number(new URL(url).searchParams.get("start")) + i + 1),
          ),
        );
  const result = await syncGarmin("owner");
  assert.equal(result.imported, 300);
  assert.equal(result.pending, true);
  assert.equal(finish.p_offset, 400);
});
test("sem lease não chama provedor; falha libera lease sem avançar cursor", async () => {
  claim = null;
  assert.equal((await syncGarmin("owner")).paused, true);
  assert.equal(calls, 0);
  claim = {
    lease: "synthetic-lease",
    after: new Date().toISOString(),
    offset: 100,
  };
  globalThis.fetch = async () => {
    throw Error("synthetic-unavailable");
  };
  await assert.rejects(() => syncGarmin("owner"));
  assert.equal(finish.p_success, false);
  assert.equal(finish.p_offset, 100);
});

test("ledger consultado em lote evita reprocessar atividades já importadas ou excluídas", async () => {
  globalThis.__garminAdmin.from = () => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async in() {
      return { data: [{ external_id: "1" }], error: null };
    },
  });
  const result = await syncGarmin("owner");
  assert.equal(result.imported, 0);
  assert.equal(records.length, 0);
  assert.equal(finish.p_success, true);
});
