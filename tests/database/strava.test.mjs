import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { sealStrava, openStrava } from "../../src/lib/strava-crypto.ts";
import {
  stravaActivities,
  stravaToken,
} from "../../src/lib/strava-provider.ts";
const root = new URL("../../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "next/headers")
      return {
        url: "data:text/javascript,export async function cookies(){return globalThis.__stravaJar}",
        shortCircuit: true,
      };
    if (specifier === "@/lib/api-account")
      return {
        url: "data:text/javascript,export async function apiAccount(){return globalThis.__stravaUser ? {user:{id:globalThis.__stravaUser}}:null}",
        shortCircuit: true,
      };
    let target = specifier.startsWith("@/")
      ? new URL(`src/${specifier.slice(2)}.ts`, root)
      : specifier.startsWith(".") && context.parentURL?.includes("/src/")
        ? new URL(specifier + ".ts", context.parentURL)
        : null;
    if (target && existsSync(fileURLToPath(target)))
      return { url: target.href, shortCircuit: true };
    return next(specifier, context);
  },
});
const connect = await import("../../src/app/api/strava/connect/route.ts");
const callback = await import("../../src/app/api/strava/callback/route.ts");
const activities = await import("../../src/app/api/strava/activities/route.ts");
const disconnect = await import("../../src/app/api/strava/disconnect/route.ts");
const server = await import("../../src/lib/strava-server.ts");
const cookies = new Map();
let counter = 0;
beforeEach(() => {
  cookies.clear();
  globalThis.__stravaUser = `synthetic-${++counter}`;
  globalThis.__stravaJar = {
    get: (name) =>
      cookies.has(name) ? { value: cookies.get(name).value } : undefined,
    set: (name, value, options) => {
      if (options?.maxAge === 0) cookies.delete(name);
      else cookies.set(name, { value, options });
    },
  };
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3100";
  process.env.STRAVA_CLIENT_ID = "12345";
  process.env.STRAVA_CLIENT_SECRET = "synthetic-secret-not-a-credential";
  globalThis.fetch = async () => {
    throw Error("Unexpected real network request");
  };
});
const post = (path, origin = "http://localhost:3100") =>
  new Request(`http://localhost:3100/api/strava/${path}`, {
    method: "POST",
    headers: { origin },
  });
const response = (value) => Response.json(value);
const token = () => ({
  access_token: "synthetic-access",
  refresh_token: "synthetic-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});
async function session(expired = false) {
  await server.putStrava(
    server.stravaCookies.session,
    {
      ...token(),
      expires_at: expired ? 0 : token().expires_at,
      user: globalThis.__stravaUser,
      until: Date.now() + 86400000,
    },
    "session",
    86400,
  );
}
test("Strava cifra cookies, rejeita adulteração, outro segredo e troca de finalidade", () => {
  const sealed = sealStrava(
    { token: "synthetic-token" },
    "session",
    "123",
    "fake-secret",
  );
  assert.ok(!sealed.includes("synthetic-token"));
  assert.deepEqual(openStrava(sealed, "session", "123", "fake-secret"), {
    token: "synthetic-token",
  });
  assert.equal(openStrava(sealed, "state", "123", "fake-secret"), null);
  assert.equal(openStrava(sealed, "session", "124", "fake-secret"), null);
  assert.equal(
    openStrava(sealed.slice(0, -5) + "AAAAA", "session", "123", "fake-secret"),
    null,
  );
});
test("OAuth exige conta e mesma origem, vincula estado e rejeita callback inválido sem chamar Strava", async () => {
  assert.equal(
    (await connect.POST(post("connect", "https://foreign.invalid"))).status,
    403,
  );
  globalThis.__stravaUser = null;
  assert.equal((await connect.POST(post("connect"))).status, 401);
  globalThis.__stravaUser = "owner";
  const started = await connect.POST(post("connect"));
  assert.equal(started.status, 303);
  const target = new URL(started.headers.get("location"));
  assert.equal(target.origin, "https://www.strava.com");
  assert.equal(target.searchParams.get("scope"), "activity:read_all");
  assert.equal(
    target.searchParams.get("redirect_uri"),
    "http://localhost:3100/api/strava/callback",
  );
  assert.equal(cookies.get(server.stravaCookies.state).options.httpOnly, true);
  const denied = await callback.GET(
    new Request(
      "http://localhost:3100/api/strava/callback?state=bad&code=invalid&scope=activity:read_all",
    ),
  );
  assert.match(denied.headers.get("location"), /strava=cancelled/);
  assert.equal(await server.stravaSession("owner"), null);
  assert.equal(cookies.has(server.stravaCookies.state), false);
});
test("OAuth aceita uma autorização válida uma vez e isola a conexão por conta", async () => {
  const started = await connect.POST(post("connect")),
    state = new URL(started.headers.get("location")).searchParams.get("state");
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), "https://www.strava.com/oauth/token");
    assert.equal(init.cache, "no-store");
    return response(token());
  };
  const url = `http://localhost:3100/api/strava/callback?state=${state}&code=synthetic&scope=read%20activity:read_all`;
  assert.match(
    (await callback.GET(new Request(url))).headers.get("location"),
    /strava=connected/,
  );
  assert.equal(calls, 1);
  const owner = globalThis.__stravaUser;
  assert.ok(await server.stravaSession(owner));
  assert.equal(await server.stravaSession("other-user"), null);
  assert.ok(
    !cookies
      .get(server.stravaCookies.session)
      .value.includes("synthetic-access"),
  );
  await callback.GET(new Request(url));
  assert.equal(calls, 1);
  globalThis.__stravaUser = "other-user";
  assert.equal((await (await activities.GET()).json()).connected, false);
});
test("estado expirado, conta diferente e escopo negado não obtêm tokens", async () => {
  for (const mode of ["expired", "other-user", "scope"]) {
    cookies.clear();
    const state = "synthetic-state";
    await server.putStrava(
      server.stravaCookies.state,
      {
        state,
        user: mode === "other-user" ? "other" : globalThis.__stravaUser,
        until: mode === "expired" ? 0 : Date.now() + 60000,
      },
      "state",
      600,
    );
    const result = await callback.GET(
      new Request(
        `http://localhost:3100/api/strava/callback?state=${state}&code=synthetic&scope=${mode === "scope" ? "read" : "activity:read_all"}`,
      ),
    );
    assert.match(result.headers.get("location"), /strava=cancelled/);
    assert.equal(cookies.has(server.stravaCookies.session), false);
  }
});
test("consulta renova tokens, preserva zero e ausência, descarta GPS e limita repetição", async () => {
  await session(true);
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(init.cache, "no-store");
    const path = String(url);
    if (path.endsWith("oauth/token")) return response(token());
    if (path.includes("athlete/activities"))
      return response([{ id: 101 }, { id: 102 }]);
    assert.match(init.headers.Authorization, /^Bearer synthetic-access$/);
    return response({
      id: path.endsWith("101") ? 101 : 102,
      name: "Atividade fictícia",
      sport_type: "Run",
      start_date_local: "2026-10-25T08:00:00",
      moving_time: 1200,
      distance: 3000,
      calories: path.endsWith("101") ? 0 : undefined,
      start_latlng: [1, 2],
      athlete: { id: 999 },
    });
  };
  const result = await activities.POST(post("activities"));
  assert.equal(result.status, 200);
  assert.match(result.headers.get("cache-control"), /no-store/);
  const data = await result.json();
  assert.equal(data.activities[0].calories, 0);
  assert.equal(data.activities[1].calories, null);
  assert.equal(data.activities[0].start_latlng, undefined);
  assert.equal(data.activities[0].athlete, undefined);
  assert.equal(calls, 4);
  assert.equal((await activities.POST(post("activities"))).status, 429);
  assert.equal(calls, 4);
});
test("consulta e desconexão rejeitam CSRF e visitante, e revogação limpa cookies", async () => {
  assert.equal(
    (await activities.POST(post("activities", "https://foreign.invalid")))
      .status,
    403,
  );
  assert.equal(
    (await disconnect.POST(post("disconnect", "https://foreign.invalid")))
      .status,
    403,
  );
  globalThis.__stravaUser = null;
  assert.equal((await activities.GET()).status, 401);
  assert.equal((await activities.POST(post("activities"))).status, 401);
  globalThis.__stravaUser = "owner";
  await session();
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://www.strava.com/oauth/revoke");
    assert.match(init.headers.Authorization, /^Basic /);
    assert.equal(init.body.get("token"), "synthetic-refresh");
    assert.equal(init.body.get("token_type_hint"), "refresh_token");
    return new Response(null, { status: 200 });
  };
  const result = await disconnect.POST(post("disconnect"));
  assert.equal(result.status, 200);
  assert.equal(cookies.has(server.stravaCookies.session), false);
});
test("falha de revogação remove conexão local e não afirma revogação confirmada", async () => {
  await session();
  globalThis.fetch = async () =>
    new Response("upstream-private-error", { status: 500 });
  const result = await disconnect.POST(post("disconnect"));
  const data = await result.json();
  assert.match(data.message, /Não foi possível confirmar/);
  assert.equal(cookies.size, 0);
  assert.ok(!data.message.includes("upstream-private-error"));
});
test("cliente Strava usa hosts fixos e não inventa composição ausente", async () => {
  const calls = [];
  await stravaToken("fake", "fake", { code: "fake" }, async (url, init) => {
    calls.push(String(url));
    assert.equal(init.method, "POST");
    return response(token());
  });
  assert.deepEqual(calls, ["https://www.strava.com/oauth/token"]);
  await assert.rejects(
    () =>
      stravaActivities(
        "fake",
        async () => new Response("private-error", { status: 401 }),
      ),
    (error) => error.reason === "unauthorized",
  );
});
test("revogação detectada na consulta apaga a sessão sem revelar a resposta do provedor", async () => {
  await session();
  globalThis.fetch = async () =>
    new Response("private-upstream-body", { status: 401 });
  const result = await activities.POST(post("activities"));
  assert.equal(result.status, 409);
  const data = await result.json();
  assert.ok(!data.message.includes("private-upstream-body"));
  assert.equal(cookies.size, 0);
  assert.equal((await (await activities.GET()).json()).connected, false);
});
test("sessão vencida e integração sem configuração não iniciam conexão", async () => {
  await server.putStrava(
    server.stravaCookies.session,
    { ...token(), user: globalThis.__stravaUser, until: 0 },
    "session",
    1,
  );
  assert.equal(await server.stravaSession(globalThis.__stravaUser), null);
  delete process.env.STRAVA_CLIENT_SECRET;
  assert.equal((await connect.POST(post("connect"))).status, 503);
  assert.equal((await (await activities.GET()).json()).configured, false);
});
