import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPlanAssetJobs } from "../../src/lib/privacy.ts";
function setup({
  committed = false,
  outage = false,
  removeError = false,
} = {}) {
  const removed = [],
    done = [];
  let pending = true;
  const job = {
    asset_id: "qa-asset",
    user_id: "qa-user",
    paths: ["owner/project/asset.webp"],
  };
  const admin = {
    storage: {
      from: () => ({
        remove: async (paths) => {
          removed.push(...paths);
          return { error: removeError ? {} : null };
        },
      }),
    },
    from: (table) => ({
      select: () => {
        if (table === "plan_assets")
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: committed
                  ? { user_id: job.user_id, storage_key: job.paths[0] }
                  : null,
                error: outage ? {} : null,
              }),
            }),
          };
        return {
          limit: async () => ({ data: pending ? [job] : [], error: null }),
        };
      },
      delete: () => ({
        eq: async (_key, id) => {
          done.push(id);
          pending = false;
          return { error: null };
        },
      }),
    }),
  };
  return { admin, removed, done };
}
test("limpeza de imagem de plano preserva upload confirmado após resposta perdida", async () => {
  const s = setup({ committed: true });
  assert.equal(await cleanPlanAssetJobs(s.admin), 1);
  assert.deepEqual(s.removed, []);
  assert.deepEqual(s.done, ["qa-asset"]);
});
test("limpeza remove somente caminhos enfileirados e mantém trabalho em falhas", async () => {
  const s = setup();
  assert.equal(await cleanPlanAssetJobs(s.admin), 1);
  assert.deepEqual(s.removed, ["owner/project/asset.webp"]);
  for (const mode of [{ outage: true }, { removeError: true }]) {
    const f = setup(mode);
    await assert.rejects(cleanPlanAssetJobs(f.admin));
    assert.deepEqual(f.done, []);
  }
});
