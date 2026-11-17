import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { garminActivities } from "../../src/lib/garmin-provider.ts";
const root = new URL("../../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "next/cache")
      return {
        url: "data:text/javascript,export function revalidatePath(){}",
        shortCircuit: true,
      };
    if (specifier === "@/lib/garmin-sleep-sync")
      return {
        url: "data:text/javascript,export async function syncGarminSleep(user){globalThis.__garminSleepSynced=user;return {updated:0,checked:false}}",
        shortCircuit: true,
      };
    if (specifier === "@/lib/garmin-sync")
      return {
        url: "data:text/javascript,export async function persistGarmin(user,activity){globalThis.__garminPersist={user,activity};return {status:'imported'}};export async function syncGarmin(user){globalThis.__garminSynced=user;return {imported:0}}",
        shortCircuit: true,
      };
    if (specifier === "@/lib/api-account")
      return {
        url: "data:text/javascript,export async function apiAccount(){return globalThis.__garminUser?{user:{id:globalThis.__garminUser},client:{async rpc(name,args){globalThis.__garminSleepSetting=args.p_enabled;return {error:null}},from(){return {select(){return this},async in(){return {data:[],error:null}}}}}}:null}",
        shortCircuit: true,
      };
    const target = specifier.startsWith("@/")
      ? new URL(`src/${specifier.slice(2)}.ts`, root)
      : specifier.startsWith(".") && context.parentURL?.includes("/src/")
        ? new URL(specifier + ".ts", context.parentURL)
        : null;
    if (target && existsSync(fileURLToPath(target)))
      return { url: target.href, shortCircuit: true };
    return next(specifier, context);
  },
});
const route = await import("../../src/app/api/garmin/activities/route.ts");
const { garminConfig } = await import("../../src/lib/garmin-config.ts");
const token = "synthetic.access.signature";
const post = (origin = "http://localhost:3100") =>
  new Request("http://localhost:3100/api/garmin/activities", {
    method: "POST",
    headers: { origin },
  });
let sequence = 0;
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3100";
  process.env.GARMIN_PERSONAL_API_KEY = `synthetic-personal-key-${++sequence}`;
  process.env.GARMIN_OWNER_USER_ID = "owner";
  globalThis.__garminUser = "owner";
  globalThis.fetch = async () => {
    throw Error("Unexpected network request");
  };
});
test("chave pessoal só fica disponível ao proprietário explicitamente configurado", () => {
  assert.ok(garminConfig("owner"));
  assert.equal(garminConfig("other"), null);
  delete process.env.GARMIN_OWNER_USER_ID;
  assert.equal(garminConfig("owner"), null);
});
test("API rejeita visitante, outra conta e CSRF antes de consultar Garmin", async () => {
  assert.equal((await route.POST(post("https://foreign.invalid"))).status, 403);
  globalThis.__garminUser = null;
  assert.equal((await route.POST(post())).status, 401);
  globalThis.__garminUser = "other";
  assert.equal((await route.POST(post())).status, 403);
  globalThis.__garminUser = "owner";
  delete process.env.GARMIN_PERSONAL_API_KEY;
  assert.equal((await route.POST(post())).status, 403);
});
test("consulta usa chave apenas no token, hosts fixos, sem redirects/cache e descarta dados extras", async () => {
  const calls = [];
  const data = await garminActivities(
    "synthetic-personal-key",
    async (url, init) => {
      calls.push(String(url));
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      if (calls.length === 1) {
        assert.equal(init.method, "POST");
        assert.equal(
          init.headers.Authorization,
          "ApiKey synthetic-personal-key",
        );
        return new Response(token);
      }
      assert.equal(init.headers.Authorization, `Bearer ${token}`);
      return Response.json([
        {
          activityId: 101,
          activityName: "Corrida fictícia",
          activityType: { typeKey: "running" },
          startTimeLocal: "2026-10-25 08:00:00",
          duration: 1800,
          distance: 5000,
          calories: 0,
          startLatitude: 1,
          ownerFullName: "Fictício",
        },
        { activityId: 102, duration: -1, distance: "unknown" },
        { activityId: 101 },
        { activityId: "../bad" },
        null,
      ]);
    },
  );
  assert.equal(calls.length, 2);
  assert.ok(
    calls.every(
      (url) => new URL(url).origin === "https://personal.connectapi.garmin.com",
    ),
  );
  assert.ok(calls[1].includes("limit=5"));
  assert.equal(data.length, 2);
  assert.equal(data[0].calories, 0);
  assert.equal(data[1].calories, null);
  assert.equal(data[1].seconds, null);
  assert.equal(data[1].metres, null);
  assert.equal(data[0].startLatitude, undefined);
  assert.equal(data[0].ownerFullName, undefined);
  assert.ok(!JSON.stringify(data).includes(token));
});
test("respostas inválidas, token vazio e erro privado não vazam", async () => {
  for (const status of [401, 403, 429, 500])
    await assert.rejects(
      () =>
        garminActivities(
          "fake",
          async () => new Response("private-upstream-body", { status }),
        ),
      (error) =>
        error.reason ===
          (status === 401 || status === 403
            ? "unauthorized"
            : status === 429
              ? "rate_limit"
              : "unavailable") && !error.message.includes("private"),
    );
  for (const body of ["", "not-a-token", "a".repeat(1000001)])
    await assert.rejects(() =>
      garminActivities("fake", async () => new Response(body)),
    );
  let call = 0;
  await assert.rejects(
    () =>
      garminActivities(
        "fake",
        async () => new Response(++call === 1 ? token : "not-json"),
      ),
    (error) => error.reason === "unavailable",
  );
});
test("API reaproveita consultas repetidas sem erro, sem revelar chave e mantendo autorização", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    return String(url).includes("personalapitoken")
      ? new Response(token)
      : Response.json([{ activityId: 1, calories: 0 }]);
  };
  const response = await route.POST(post());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  const body = await response.json();
  assert.equal(body.activities[0].calories, 0);
  assert.ok(!JSON.stringify(body).includes("synthetic"));
  assert.equal((await route.POST(post())).status, 200);
  assert.equal(calls, 2);
  globalThis.__garminUser = "other";
  assert.equal((await route.POST(post())).status, 403);
  assert.equal(calls, 2);
  globalThis.__garminUser = "owner";
  process.env.GARMIN_PERSONAL_API_KEY = "rotated-synthetic-key";
  assert.equal((await route.POST(post())).status, 200);
  assert.equal(calls, 4);
});

test("falha não bloqueia nova tentativa e solicitações simultâneas compartilham a leitura", async () => {
  globalThis.fetch = async () => new Response("private-error", { status: 500 });
  const failed = await route.POST(post());
  assert.equal(failed.status, 502);
  assert.ok(!JSON.stringify(await failed.json()).includes("private-error"));
  let calls = 0,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  globalThis.fetch = async (url) => {
    calls++;
    if (String(url).includes("personalapitoken")) {
      await gate;
      return new Response(token);
    }
    return Response.json([{ activityId: 2 }]);
  };
  const first = route.POST(post()),
    second = route.POST(post());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release();
  assert.deepEqual(
    (await Promise.all([first, second])).map((r) => r.status),
    [200, 200],
  );
  assert.equal(calls, 2);
  const now = Date.now;
  try {
    Date.now = () => now() + 61000;
    assert.equal((await route.POST(post())).status, 200);
    assert.equal(calls, 4);
  } finally {
    Date.now = now;
  }
});

test("detalhe importável usa ID fixo e composição retornada pela Garmin", async () => {
  const { garminActivity, garminModality } =
    await import("../../src/lib/garmin-provider.ts");
  const calls = [];
  const activity = await garminActivity("fake", "123", async (url) => {
    calls.push(String(url));
    return calls.length === 1
      ? new Response(token)
      : Response.json({
          activityId: 123,
          activityName: "Treino fictício",
          activityTypeDTO: { typeKey: "strength_training" },
          summaryDTO: {
            duration: 1200,
            distance: 0,
            calories: 0,
            startTimeLocal: "2026-10-25 08:00:00",
            startTimeGMT: "2026-10-25T11:00:00.0",
            startLatitude: 1,
          },
        });
  });
  assert.equal(
    calls[1],
    "https://personal.connectapi.garmin.com/activity-service/activity/123",
  );
  assert.equal(activity.calories, 0);
  assert.equal(activity.startedAt, "2026-10-25T11:00:00.000Z");
  assert.equal(garminModality(activity.sport), "strength");
  assert.equal(garminModality("walking"), "other");
  assert.equal(activity.startLatitude, undefined);
  await assert.rejects(() => garminActivity("fake", "../123"));
});

test("importação verifica sessão/origem, ignora dados forjados e consulta o detalhe oficial", async () => {
  const route = await import("../../src/app/api/garmin/import/route.ts");
  const request = (body = {}, origin = "http://localhost:3100") =>
    new Request("http://localhost:3100/api/garmin/import", {
      method: "POST",
      headers: { origin },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await route.POST(request({ ids: ["123"] }, "https://foreign.invalid")))
      .status,
    403,
  );
  globalThis.__garminUser = null;
  assert.equal((await route.POST(request({ ids: ["123"] }))).status, 401);
  globalThis.__garminUser = "other";
  assert.equal((await route.POST(request({ ids: ["123"] }))).status, 403);
  globalThis.__garminUser = "owner";
  assert.equal((await route.POST(request({ ids: ["../123"] }))).status, 400);
  globalThis.fetch = async (url) =>
    String(url).includes("personalapitoken")
      ? new Response(token)
      : Response.json({
          activityId: 123,
          activityName: "Nome do provedor",
          activityTypeDTO: { typeKey: "running" },
          summaryDTO: {
            duration: 900,
            distance: 1500,
            calories: 75,
            startTimeLocal: "2026-10-25 08:00:00",
          },
        });
  const response = await route.POST(
    request({ ids: ["123"], user: "other", calories: 9999, name: "Forjado" }),
  );
  assert.equal(response.status, 200);
  assert.equal(globalThis.__garminPersist.user, "owner");
  assert.equal(globalThis.__garminPersist.activity.calories, 75);
  assert.equal(globalThis.__garminPersist.activity.name, "Nome do provedor");
});
test("sincronização agendada requer segredo, usa proprietário do servidor e rejeita cabeçalho inválido", async () => {
  const route = await import("../../src/app/api/garmin/sync/route.ts");
  process.env.GARMIN_SYNC_SECRET =
    "synthetic-secret-for-background-sync-123456";
  globalThis.__garminUser = null;
  const request = (authorization, origin) =>
    new Request("http://localhost:3100/api/garmin/sync", {
      method: "POST",
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(origin ? { origin } : {}),
      },
    });
  assert.equal((await route.POST(request("Bearer wrong"))).status, 403);
  assert.equal(
    (await route.POST(request(null, "http://localhost:3100"))).status,
    401,
  );
  assert.equal(
    (await route.POST(request("Bearer " + "é".repeat(40)))).status,
    403,
  );
  assert.equal(
    (await route.POST(request("Bearer " + process.env.GARMIN_SYNC_SECRET)))
      .status,
    200,
  );
  assert.equal(globalThis.__garminSynced, "owner");
});

test("sono exige sessão e origem, valida adesão e não aceita identidade fornecida pelo cliente", async () => {
  const sleep = await import("../../src/app/api/garmin/sleep/route.ts");
  const request = (body, origin = "http://localhost:3100") =>
    new Request("http://localhost:3100/api/garmin/sleep", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  globalThis.__garminUser = null;
  assert.equal((await sleep.POST(request({ enabled: true }))).status, 401);
  globalThis.__garminUser = "owner";
  assert.equal(
    (await sleep.POST(request({ enabled: true }, "https://foreign.invalid")))
      .status,
    403,
  );
  assert.equal((await sleep.POST(request({ enabled: "true" }))).status, 400);
  globalThis.__garminUser = "other";
  assert.equal((await sleep.POST(request({ enabled: true }))).status, 403);
  globalThis.__garminUser = "owner";
  assert.equal(
    (await sleep.POST(request({ enabled: true, user: "other" }))).status,
    200,
  );
  assert.equal(globalThis.__garminSleepSetting, true);
  assert.equal(globalThis.__garminSleepSynced, "owner");
  assert.equal((await sleep.POST(request({ enabled: false }))).status, 200);
  assert.equal(globalThis.__garminSleepSetting, false);
});
