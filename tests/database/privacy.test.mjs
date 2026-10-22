import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcilePhotoStorage } from "../../src/lib/privacy.ts";
const owner = "00000000-0000-4000-8000-000000000001",
  project = "00000000-0000-4000-8000-000000000002";
const linked = "00000000-0000-4000-8000-000000000003",
  orphan = "00000000-0000-4000-8000-000000000004",
  recent = "00000000-0000-4000-8000-000000000005";
const now = Date.parse("2026-10-21T12:00:00Z");
function client({ deleted = false, outage = false } = {}) {
  const removed = [];
  const files = [linked, orphan, recent].map((id) => ({
    id,
    name: `${id}.webp`,
    created_at: id === recent ? "2026-10-21T11:00:00Z" : "2026-10-19T11:00:00Z",
  }));
  return {
    removed,
    storage: {
      from: () => ({
        list: async (prefix) => ({
          data:
            prefix === ""
              ? [{ id: null, name: owner }]
              : prefix === owner
                ? [{ id: null, name: project }]
                : files,
          error: null,
        }),
        remove: async (paths) => {
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
    auth: {
      admin: {
        getUserById: async () =>
          outage
            ? { data: null, error: { status: 503 } }
            : deleted
              ? { data: null, error: { status: 404, code: "user_not_found" } }
              : { data: { user: { id: owner } }, error: null },
      },
    },
    from: () => ({
      select: () => ({
        eq: (_key, id) => ({
          maybeSingle: async () => ({
            data:
              id === linked
                ? { storage_key: `${owner}/${project}/${linked}.webp` }
                : null,
            error: null,
          }),
        }),
      }),
    }),
  };
}
test("reconciliação preserva fotos referenciadas e uploads recentes", async () => {
  const admin = client();
  assert.equal(await reconcilePhotoStorage(admin, now), 1);
  assert.deepEqual(admin.removed, [`${owner}/${project}/${orphan}.webp`]);
});
test("conta excluída remove órfãos; indisponibilidade não é tratada como exclusão", async () => {
  const deleted = client({ deleted: true });
  assert.equal(await reconcilePhotoStorage(deleted, now), 3);
  const down = client({ outage: true });
  await assert.rejects(reconcilePhotoStorage(down, now), /proprietário/);
  assert.deepEqual(down.removed, []);
});
