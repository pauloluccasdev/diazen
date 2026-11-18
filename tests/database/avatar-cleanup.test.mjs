import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanAvatarJobs,
  reconcilePhotoStorage,
} from "../../src/lib/privacy.ts";
const owner = "00000000-0000-4000-8000-000000000081",
  other = "00000000-0000-4000-8000-000000000082";
const a = "00000000-0000-4000-8000-000000000088",
  b = "00000000-0000-4000-8000-000000000089";
const path = (user, id) => `${user}/avatars/${id}.webp`;
const job = (user, id, delay = 0) => ({
  user_id: user,
  avatar_id: id,
  storage_key: path(user, id),
  revision: 1,
  available_after: new Date(Date.now() + delay).toISOString(),
});
function client({
  jobs = [],
  profiles = {},
  outage = false,
  removeError = false,
  onRead,
  serverNow = () => Date.now(),
} = {}) {
  const removed = [];
  return {
    jobs,
    profiles,
    removed,
    async rpc(name, { p_user_id, p_limit }) {
      assert.equal(name, "due_avatar_jobs");
      return {
        data: jobs
          .filter(
            (entry) =>
              (!p_user_id || entry.user_id === p_user_id) &&
              Date.parse(entry.available_after) <= serverNow(),
          )
          .slice(0, p_limit)
          .map((entry) => ({ ...entry })),
        error: null,
      };
    },
    storage: {
      from: () => ({
        remove: async (paths) => {
          if (removeError) return { error: { status: 503 } };
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
    from(table) {
      if (table === "profiles")
        return {
          select: () => ({
            eq: (_key, user) => ({
              maybeSingle: async () => {
                const data = profiles[user] ?? null;
                if (onRead) onRead(user, jobs, profiles);
                return { data, error: outage ? { status: 503 } : null };
              },
            }),
          }),
        };
      if (table !== "avatar_cleanup") throw Error("Tabela inesperada");
      const query = {
        filters: {},
        limitCount: 50,
        select() {
          return this;
        },
        delete() {
          this.removing = true;
          return this;
        },
        lte(key, value) {
          this.filters[key] = { lte: value };
          return this;
        },
        order() {
          return this;
        },
        limit(value) {
          this.limitCount = value;
          return this;
        },
        eq(key, value) {
          this.filters[key] = value;
          return this;
        },
        then(resolve, reject) {
          try {
            const match = (entry) =>
              Object.entries(this.filters).every(([key, value]) =>
                typeof value === "object"
                  ? entry[key] <= value.lte
                  : String(entry[key]) === String(value),
              );
            if (this.removing) {
              for (let i = jobs.length - 1; i >= 0; i--)
                if (match(jobs[i])) jobs.splice(i, 1);
              return Promise.resolve({ error: null }).then(resolve, reject);
            }
            return Promise.resolve({
              data: jobs
                .filter(match)
                .slice(0, this.limitCount)
                .map((entry) => ({ ...entry })),
              error: null,
            }).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        },
      };
      return query;
    },
  };
}
test("limpeza preserva avatar atual e aguarda uploads ainda em andamento", async () => {
  const admin = client({
    jobs: [job(owner, a, -1000), job(owner, b, 15 * 60 * 1000)],
    profiles: { [owner]: { avatar_id: a, avatar_key: path(owner, a) } },
  });
  assert.equal(await cleanAvatarJobs(admin, owner), 1);
  assert.deepEqual(admin.removed, []);
  assert.equal(admin.jobs.length, 1);
  assert.equal(admin.jobs[0].avatar_id, b);
});
test("limpeza usa o relógio do banco mesmo quando a aplicação está atrasada", async () => {
  const admin = client({
    jobs: [job(owner, a, 1000), job(owner, b, 15 * 60 * 1000)],
    serverNow: () => Date.now() + 3000,
  });
  assert.equal(await cleanAvatarJobs(admin, owner), 1);
  assert.deepEqual(admin.removed, [path(owner, a)]);
  assert.equal(admin.jobs[0].avatar_id, b);
});
test("arquivo antigo é removido e fila usa proprietário junto com UUID", async () => {
  const admin = client({
    jobs: [job(owner, a, -1000), job(other, a, -1000)],
    profiles: { [owner]: { avatar_id: b, avatar_key: path(owner, b) } },
  });
  assert.equal(await cleanAvatarJobs(admin, owner), 1);
  assert.deepEqual(admin.removed, [path(owner, a)]);
  assert.equal(admin.jobs.length, 1);
  assert.equal(admin.jobs[0].user_id, other);
});
test("falha de verificação ou remoção mantém fila e não presume objeto descartável", async () => {
  const down = client({ jobs: [job(owner, a, -1000)], outage: true });
  await assert.rejects(cleanAvatarJobs(down), /verificar/);
  assert.equal(down.jobs.length, 1);
  assert.deepEqual(down.removed, []);
  const removal = client({ jobs: [job(owner, a, -1000)], removeError: true });
  await assert.rejects(cleanAvatarJobs(removal), /remover/);
  assert.equal(removal.jobs.length, 1);
});
test("revisão impede perder trabalho reaberto por substituição concorrente", async () => {
  let raced = false;
  const admin = client({
    jobs: [job(owner, a, -1000)],
    profiles: { [owner]: { avatar_id: a, avatar_key: path(owner, a) } },
    onRead(user, jobs, profiles) {
      if (!raced) {
        raced = true;
        jobs[0].revision++;
        profiles[user] = { avatar_id: b, avatar_key: path(user, b) };
      }
    },
  });
  assert.equal(await cleanAvatarJobs(admin, owner, 1), 1);
  assert.deepEqual(admin.removed, []);
  assert.equal(admin.jobs.length, 1);
  assert.equal(admin.jobs[0].revision, 2);
  assert.equal(await cleanAvatarJobs(admin, owner), 1);
  assert.deepEqual(admin.removed, [path(owner, a)]);
  assert.equal(admin.jobs.length, 0);
});

function reconciliation({
  deleted = false,
  authOutage = false,
  profileOutage = false,
} = {}) {
  const admin = client({
    profiles: { [owner]: { avatar_key: path(owner, a) } },
  });
  const old = "2026-11-01T00:00:00Z",
    recent = "2026-11-18T11:00:00Z";
  admin.auth = {
    admin: {
      getUserById: async () =>
        authOutage
          ? { data: null, error: { status: 503 } }
          : deleted
            ? { data: null, error: { status: 404, code: "user_not_found" } }
            : { data: { user: { id: owner } }, error: null },
    },
  };
  admin.storage.from = () => ({
    list: async (prefix) => ({
      error: null,
      data:
        prefix === ""
          ? [{ id: null, name: owner }]
          : prefix === owner
            ? [{ id: null, name: "avatars" }]
            : [
                { id: a, name: `${a}.webp`, created_at: old },
                { id: b, name: `${b}.webp`, created_at: old },
                {
                  id: "recent",
                  name: "00000000-0000-4000-8000-000000000090.webp",
                  created_at: recent,
                },
              ],
    }),
    remove: async (paths) => {
      admin.removed.push(...paths);
      return { error: null };
    },
  });
  if (profileOutage)
    admin.from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { status: 503 } }),
        }),
      }),
    });
  return admin;
}
test("reconciliação reconhece namespace de avatar e conserva atual/recentes", async () => {
  const admin = reconciliation();
  assert.equal(
    await reconcilePhotoStorage(admin, Date.parse("2026-11-18T12:00:00Z")),
    1,
  );
  assert.deepEqual(admin.removed, [path(owner, b)]);
});
test("Auth indisponível ou referência ilegível não autorizam reconciliação destrutiva", async () => {
  for (const options of [{ authOutage: true }, { profileOutage: true }]) {
    const admin = reconciliation(options);
    await assert.rejects(reconcilePhotoStorage(admin));
    assert.deepEqual(admin.removed, []);
  }
  const deleted = reconciliation({ deleted: true });
  assert.equal(await reconcilePhotoStorage(deleted), 3);
});
