// Explicitly isolated QA: real Next.js + PostgreSQL migrations, simulated Auth/Storage.
// All browser interactions use the agent-browser CLI, never Playwright's page API.
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { purgeAccount } from "../../src/lib/privacy.ts";

const hosted = process.argv.includes("--hosted");
const origin = hosted
  ? "https://diazen-git-develop-pauloluccas-projects-58a37ef2.vercel.app"
  : "http://127.0.0.1:3100";
const accounts = [];
let admin;
let remainingPhotoUrl;
const passwordFor = (email) =>
  accounts.find((a) => a.alias === email)?.password ?? "senha-de-teste-123";
const emailFor = (email) =>
  accounts.find((a) => a.alias === email)?.email ?? email;
const headers = hosted
  ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN }
  : {};
async function appFetch(path) {
  return fetch(origin + path, { headers });
}
const output = new URL("../../artifacts/agent-browser/", import.meta.url);
await mkdir(output, { recursive: true });
const run = new Date().toISOString().replaceAll(":", "-");
const session = `diazen-qa-${process.pid}`;
let activeSession = session;
const browserSessions = new Set();
// Locate the binary installed by the CI; browser control remains entirely CLI.
const browserPath = process.env.DIAZEN_QA_PLAYWRIGHT_BROWSER
  ? (await import("@playwright/test")).chromium.executablePath()
  : undefined;
const report = {
  startedAt: new Date().toISOString(),
  engine: "agent-browser",
  environment: hosted ? "hosted-preview-synthetic-accounts" : "local-isolated",
  authStorage: hosted ? "real Supabase" : "simulated",
  database: hosted
    ? "real Supabase PostgreSQL"
    : "PGlite with actual migrations/RLS",
  checks: [],
  audits: [],
  timings: [],
  passed: false,
};
const children = [];
let current = "startup";
function command(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (b) => (stdout += b));
    child.stderr.on("data", (b) => (stderr += b));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(new Error(`${bin}: ${stderr || stdout}`)),
    );
    child.stdin.end(options.input);
  });
}
async function ab(...args) {
  browserSessions.add(activeSession);
  if (
    ["click", "check", "uncheck", "fill", "select"].includes(args[0]) &&
    !args[1].startsWith("@")
  ) {
    await ab("snapshot", "-i");
    const snap = await ab("snapshot", "-i", "-s", args[1]);
    const ref = snap.snapshot.match(/\bref=(e\d+)/)?.[1];
    assert.ok(
      ref,
      `No interactive target for ${args[1]}: ${JSON.stringify(snap)}`,
    );
    args[1] = "@" + ref;
  }
  if (process.env.QA_DEBUG && !hosted)
    console.log(
      args[0],
      args[0] === "eval" || args[0] === "wait" ? "" : args.slice(1).join(" "),
    );
  const raw = await command(
    "agent-browser",
    ["--session", activeSession, "--json", ...args],
    {
      env: {
        ...process.env,
        ...(browserPath ? { AGENT_BROWSER_EXECUTABLE_PATH: browserPath } : {}),
        AGENT_BROWSER_DEFAULT_TIMEOUT: hosted ? "30000" : "12000",
      },
    },
  );
  const result = JSON.parse(raw);
  if (!result.success)
    throw new Error(result.error?.message ?? JSON.stringify(result.error));
  return result.data;
}
async function evaluate(code) {
  return (await ab("eval", "-b", Buffer.from(code).toString("base64"))).result;
}
async function until(code) {
  await ab("wait", "--fn", code);
}
async function text(value) {
  await until(`document.body.innerText.includes(${JSON.stringify(value)})`);
}
async function goto(path) {
  const started = performance.now();
  await ab("open", origin + path);
  await ab("wait", "--load", "load");
  await until("document.querySelector('main h1') !== null");
  report.timings.push({
    path,
    ms: Math.round(performance.now() - started),
    network: hosted
      ? "WSL desktop over Internet, not physical mobile"
      : "local desktop, not physical mobile",
  });
}
async function clickText(value, tag = "button", scope = "document") {
  const code = `(() => { const root=${scope}; const e=[...root.querySelectorAll(${JSON.stringify(tag)})].find(e=>e.textContent.trim()===${JSON.stringify(value)} && e.getClientRects().length && !e.matches(':disabled')); if(!root || !e || (['button','summary'].includes(${JSON.stringify(tag)}) && !Object.keys(e).some(k=>k.startsWith('__reactProps'))))return false; document.querySelectorAll('[data-qa-target]').forEach(e=>e.removeAttribute('data-qa-target'));e.setAttribute('data-qa-target','yes');return true;})()`;
  await until(code);
  if (tag === "summary" || tag === "button") {
    // Resolve the hydrated target again after pagination. Scroll instantly so
    // smooth scrolling cannot race keyboard focus; verify actual focus before Enter.
    await until(
      `(() => { if (!${code}) return false; const e=document.querySelector('[data-qa-target=yes]'); if(!e?.isConnected) return false; e.scrollIntoView({block:'center',behavior:'instant'}); e.focus({preventScroll:true}); return document.activeElement===e; })()`,
    );
    await ab("press", "Enter");
  } else await ab("click", "[data-qa-target=yes]");
}
async function field(name, value, scope = "", type = "fill") {
  const selector = `${scope} [name="${name}"]`.trim();
  // Chromium's segmented date controls need their native value setter; typing
  // an ISO string with this CLI clears the control instead of selecting a date.
  if (
    type === "fill" &&
    (await evaluate(
      `document.querySelector(${JSON.stringify(selector)})?.type === 'date'`,
    ))
  ) {
    await evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return e.value;})()`,
    );
  } else await ab(type, selector, String(value));
}
const form = (button) =>
  `[...document.querySelectorAll('form')].find(f=>!f.closest('details:not([open])') && f.getClientRects().length && [...f.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(button)}))`;
async function markForm(button) {
  const closedCreate = await evaluate(
    `(() => { const d=document.querySelector('details.record-create:not([open])'); return Boolean(d && [...d.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(button)})); })()`,
  );
  if (closedCreate) {
    const title = await evaluate(
      "document.querySelector('details.record-create > summary').textContent.trim()",
    );
    await clickText(title, "summary");
  }
  await until(
    `(() => { const f=${form(button)}; if(!f || !Object.keys(f).some(k=>k.startsWith('__reactProps')))return false;document.querySelectorAll('[data-qa-form]').forEach(e=>e.removeAttribute('data-qa-form'));f.setAttribute('data-qa-form','yes');return true;})()`,
  );
  return "[data-qa-form=yes]";
}
async function save(button, values, expected) {
  const selector = await markForm(button);
  for (const [name, value] of Object.entries(values))
    await field(name, value, selector);
  await clickText(button, "button", form(button));
  if (expected) await text(expected);
}
async function check(name, action) {
  current = name;
  await action();
  await browserDiagnostics(name);
  report.checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
async function browserDiagnostics(phase, controlledServerFailure = false) {
  await ab("wait", "--load", "load");
  const errors = (await ab("errors")).errors;
  if (errors.length && controlledServerFailure) {
    // Only the deliberately interrupted SSR boundary may report React's
    // recoverable #419 (or its sanitized server-render counterpart).
    assert.ok(
      errors.every((e) =>
        /Minified React error #419\b|An error occurred in the Server Components render/.test(
          e.text,
        ),
      ),
      `Unexpected error during ${phase}: ${JSON.stringify(errors)}`,
    );
    (report.expectedFaultDiagnostics ??= []).push({ phase, errors });
  } else
    assert.deepEqual(
      errors,
      [],
      `Unexpected browser exception during ${phase}`,
    );
  await ab("errors", "--clear");
}
async function count(n) {
  await until(`document.querySelectorAll('article').length === ${n}`);
}
async function audit(name) {
  const result = await ab("a11y", "--tags", "wcag2a,wcag2aa,wcag21aa,wcag22aa");
  report.audits.push({ name, ...result });
  assert.equal(result.violations.length, 0, `Accessibility: ${name}`);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await ab("set", "viewport", String(width), "844");
    assert.equal(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
      true,
      `Overflow ${name}: ${width}`,
    );
  }
  await ab(
    "screenshot",
    new URL(`${run}-${name}.png`, output).pathname,
    "--full",
  );
}
async function login(email) {
  await goto("/entrar");
  await save("Entrar", {
    email: emailFor(email),
    password: passwordFor(email),
  });
  await ab("wait", "--url", "**/painel");
}
async function logout() {
  await goto("/painel/perfil");
  await clickText("Sair da conta");
  await ab("wait", "--url", "**/entrar");
}
async function project(name) {
  await goto("/painel/projetos");
  await save(
    "Criar projeto",
    { name, starts_on: "2026-01-01", water_ml: 2000, sessions: 3 },
    "Projeto criado",
  );
}
async function launch(bin, args, env = {}) {
  const child = spawn(bin, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  const log = [];
  child.stdout.on("data", (b) => log.push(String(b)));
  child.stderr.on("data", (b) => log.push(String(b)));
  child.on("error", (e) => log.push(e.message));
  return { child, log };
}
async function ready(url, process) {
  for (let i = 0; i < 150; i++) {
    if (process.child.exitCode !== null) throw new Error(process.log.join(""));
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not start: ${url}`);
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const ended = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await ended;
}
async function startApp() {
  const app = await launch(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      NEXT_PUBLIC_SITE_URL: origin,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
      SUPABASE_SECRET_KEY: "chave-secreta-de-teste",
    },
  );
  await ready(origin, app);
  return app;
}
try {
  let app;
  if (hosted) {
    assert.ok(
      process.env.VERCEL_OIDC_TOKEN,
      "Run hosted verification with vercel env run",
    );
    process.loadEnvFile(".env.local");
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    for (const alias of ["registros@example.test", "teste@example.test"]) {
      const email = `diazen-agent-qa-${randomUUID()}@example.invalid`,
        password = randomBytes(32).toString("base64url") + "aA1!";
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { purpose: "diazen-agent-browser-qa" },
      });
      assert.ok(!created.error, "Could not create synthetic QA account");
      accounts.push({ alias, email, password, id: created.data.user.id });
    }
    await ab("open", origin, "--headers", JSON.stringify(headers));
  } else {
    for (const port of [3100, 54329]) {
      let running = false;
      try {
        await fetch(`http://127.0.0.1:${port}`);
        running = true;
      } catch {}
      assert.equal(
        running,
        false,
        `Port ${port} must be free; refusing to reuse a server`,
      );
    }
    const db = await launch(process.execPath, [
      "tests/fixtures/auth-server.mjs",
    ]);
    await ready("http://127.0.0.1:54329/health", db);
    app = await startApp();
  }
  await check(
    "RF001/RNF002 unauthenticated routes and export denied",
    async () => {
      await goto("/painel");
      assert.match(await evaluate("location.pathname"), /entrar/);
      assert.equal((await appFetch("/api/exportar")).status, 401);
    },
  );
  await check(
    "RNF001/005/009 health, security headers, manifest and icons",
    async () => {
      const health = await evaluate(
        "fetch('/api/saude').then(async r=>({status:r.status,body:await r.json(),frame:r.headers.get('x-frame-options'),mime:r.headers.get('x-content-type-options')}))",
      );
      assert.equal(health.status, 200);
      assert.deepEqual(health.body, {
        status: "ok",
        service: "diazen",
        version: "0.1.0",
      });
      assert.equal(health.frame, "DENY");
      assert.equal(health.mime, "nosniff");
      const manifest = await evaluate(
        "fetch('/manifest.webmanifest').then(r=>r.json())",
      );
      assert.equal(manifest.display, "standalone");
      for (const icon of manifest.icons)
        assert.equal(
          await evaluate(
            `fetch(${JSON.stringify(icon.src)}).then(r=>r.status)`,
          ),
          200,
        );
    },
  );
  await check("RF001/RNF001 generic login errors", async () => {
    await save(
      "Entrar",
      { email: emailFor("teste@example.test"), password: "incorreta-longa" },
      "Não foi possível entrar",
    );
    const first = await evaluate(
      "document.querySelector('main [role=alert]').textContent",
    );
    await save(
      "Entrar",
      { email: "ausente@example.test", password: "incorreta-longa" },
      first,
    );
    assert.equal(
      await evaluate("document.querySelector('main [role=alert]').textContent"),
      first,
    );
    await audit("login");
  });
  if (!hosted) {
    await check(
      "RF001 signup mismatch, confirmation and PKCE callback",
      async () => {
        await goto("/cadastro");
        await save(
          "Criar conta",
          {
            email: "novo@example.test",
            password: "senha-de-teste-123",
            confirmation: "outra-senha-longa",
          },
          "precisam ser iguais",
        );
        await save(
          "Criar conta",
          {
            email: "novo@example.test",
            password: "senha-de-teste-123",
            confirmation: "senha-de-teste-123",
          },
          "Se o cadastro puder ser concluído",
        );
        const { link } = await (
          await fetch(
            "http://127.0.0.1:54329/_test/email-link?email=novo%40example.test",
          )
        ).json();
        assert.ok(link);
        await ab("open", link);
        await ab("wait", "--url", "**/painel");
        await logout();
      },
    );
    await check("RF001 recovery, new password and invalid link", async () => {
      await goto("/recuperar-senha");
      await save(
        "Enviar instruções",
        { email: "teste@example.test" },
        "Se houver uma conta",
      );
      const { link } = await (
        await fetch(
          "http://127.0.0.1:54329/_test/email-link?email=teste%40example.test",
        )
      ).json();
      await ab("open", link);
      await ab("wait", "--url", "**/nova-senha");
      await save(
        "Salvar nova senha",
        { password: "senha-renovada-123", confirmation: "senha-renovada-123" },
        "Senha atualizada",
      );
      await logout();
      await goto("/auth/confirmar?code=invalido&next=https://example.org");
      await text("link expirou");
    });
    await check(
      "RF001/RNF001 PKCE rejects another browser, reused code and tampered verifier",
      async () => {
        await goto("/recuperar-senha");
        await save(
          "Enviar instruções",
          { email: "teste@example.test" },
          "Se houver uma conta",
        );
        const { link } = await (
          await fetch(
            "http://127.0.0.1:54329/_test/email-link?email=teste%40example.test",
          )
        ).json();
        const verified = await fetch(link, { redirect: "manual" });
        assert.equal(verified.status, 302);
        const callback =
          verified.headers.get("location") + "&next=https://example.org";
        activeSession = session + "-other";
        await ab("open", callback);
        await ab("wait", "--url", "**/entrar?link=invalido");
        activeSession = session;
        await ab("open", callback);
        await ab("wait", "--url", "**/nova-senha");
        activeSession = session + "-other";
        await ab("open", callback);
        await ab("wait", "--url", "**/entrar?link=invalido");
        await ab("close");
        activeSession = session;
        await logout();
        await goto("/cadastro");
        await save(
          "Criar conta",
          {
            email: "tampered@example.test",
            password: "senha-de-teste-123",
            confirmation: "senha-de-teste-123",
          },
          "Se o cadastro puder ser concluído",
        );
        const verifiers = (await ab("cookies", "get")).cookies.filter((c) =>
          c.name.includes("-code-verifier"),
        );
        assert.ok(verifiers.length > 0);
        const tampered =
          "base64-" +
          Buffer.from(JSON.stringify("tampered-verifier")).toString(
            "base64url",
          );
        for (const c of verifiers)
          await ab(
            "cookies",
            "set",
            c.name,
            tampered,
            "--url",
            origin,
            "--path",
            c.path,
          );
        const changed = (await ab("cookies", "get")).cookies.filter((c) =>
          c.name.includes("-code-verifier"),
        );
        assert.ok(changed.every((c) => c.value === tampered));
        const pending = await (
          await fetch(
            "http://127.0.0.1:54329/_test/email-link?email=tampered%40example.test",
          )
        ).json();
        await ab("open", pending.link);
        await ab("wait", "--url", "**/entrar?link=invalido");
      },
    );
  } else
    report.limitations = [
      "Signup and recovery PKCE are exercised locally; this hosted run does not send email.",
      "Physical installation, screen reader and production configuration cannot be established by desktop automation.",
    ];
  if (!hosted)
    await check(
      "RF004/RB02 closure between list and ACTIVE reads never offers a stale editor",
      async () => {
        for (const [route, n] of [
          ["agua", 8],
          ["fotos", 9],
        ]) {
          await login(`concorrencia${n}@example.test`);
          await project(`Concorrência ${route}`);
          await fetch(
            `http://127.0.0.1:54329/_test/close-on-project-read/00000000-0000-4000-8000-00000000000${n}`,
          );
          await goto(`/painel/${route}`);
          await text("somente leitura.");
          assert.equal(
            await evaluate(
              "[...document.querySelectorAll('button')].some(b=>['Salvar registro','Salvar foto','Confirmar exclusão','Excluir foto'].includes(b.textContent.trim()))",
            ),
            false,
          );
          await logout();
        }
      },
    );
  await login("registros@example.test");
  await check(
    "RF002-005 onboarding, measurable goals and ACTIVE uniqueness",
    async () => {
      await goto("/painel/projetos");
      await save(
        "Criar projeto",
        { name: "Sem metas" },
        "Não foi possível criar.",
      );
      await project("Auditoria principal");
      await ab("reload");
      await text("Auditoria principal");
      await save(
        "Criar projeto",
        { name: "Segundo ativo", water_ml: 2000 },
        "Não foi possível criar.",
      );
      await count(1);
      await audit("projetos");
    },
  );
  await check(
    "RF003/005 permitted name edits and weight target/range goals persist",
    async () => {
      await goto("/painel/projetos");
      await clickText("Editar nome", "summary");
      await save(
        "Atualizar nome",
        { name: "Projeto revisado QA" },
        "Projeto revisado QA",
      );
      await save(
        "Atualizar nome",
        { name: "Auditoria principal" },
        "Auditoria principal",
      );
      for (const mode of ["target", "range"]) {
        await goto("/painel/projetos");
        await clickText("Editar metas de peso e atividades", "summary");
        const s = await markForm("Salvar metas");
        await field("weight_mode", mode, s, "select");
        await save(
          "Salvar metas",
          {
            weight_min: mode === "target" ? 75 : 70,
            weight_max: mode === "target" ? "" : 80,
            sessions: 3,
          },
          "Metas atualizadas",
        );
        const exported = await evaluate(
          "fetch('/api/exportar').then(r=>r.json())",
        );
        const p = exported.projects.find((p) => p.status === "ACTIVE");
        assert.equal(p.weight_mode, mode);
        assert.equal(Number(p.weight_min), mode === "target" ? 75 : 70);
        if (mode === "range") assert.equal(Number(p.weight_max), 80);
      }
    },
  );
  await check(
    "RF010-011/RB07 water sum, editing, deleting and temporal goal",
    async () => {
      await goto("/painel/agua");
      await save(
        "Salvar registro",
        { volume_ml: 300, container_label: "Copo QA" },
        "300 ml",
      );
      await save("Salvar registro", { volume_ml: 200 }, "500 ml");
      await count(2);
      await clickText(
        "Editar registro",
        "summary",
        "[...document.querySelectorAll('article')].find(a=>a.querySelector('h3')?.textContent.startsWith('200 ml'))",
      );
      await save("Salvar alteração", { volume_ml: 450 }, "750 ml");
      await clickText(
        "Excluir registro",
        "summary",
        "[...document.querySelectorAll('article')].find(a=>a.querySelector('h3')?.textContent.startsWith('450 ml'))",
      );
      const del = await markForm("Confirmar exclusão");
      await ab("check", del + " [name=confirm]");
      await clickText(
        "Confirmar exclusão",
        "button",
        form("Confirmar exclusão"),
      );
      await count(1);
      await text("300 ml");
      await audit("agua");
      await goto("/painel/projetos");
      await clickText("Configurar meta de água", "summary");
      await save(
        "Salvar meta",
        { target_ml: 2500 },
        "Meta de água salva com sua data de vigência.",
      );
      await goto("/painel/agua");
      await text("Meta de 2.500 ml");
    },
  );
  await check("RF014/RB06 weight replaces same day and chart", async () => {
    await goto("/painel/peso");
    await save("Salvar peso", { kg: 90 }, "Peso salvo");
    await save("Salvar peso", { kg: 89.5 }, "89,5 kg");
    await count(1);
    await ab("reload");
    await text("89,5 kg");
    await count(1);
    await audit("peso");
  });
  await check(
    "RF015 partial measurements and same date replacement",
    async () => {
      await goto("/painel/medidas");
      await save("Salvar medidas", { waist: 90 }, "90 cm");
      await count(1);
      await save("Salvar medidas", { waist: 88 }, "88 cm");
      await count(1);
      await audit("medidas");
    },
  );
  await check("RF012-013 all modalities and mandatory distance", async () => {
    await goto("/painel/atividades");
    let s = await markForm("Salvar registro");
    await field("modality", "running", s, "select");
    await save("Salvar registro", { duration_min: 30 }, "exigem distância");
    await save(
      "Salvar registro",
      { duration_min: 30, distance_km: 5 },
      "1 sessões na semana",
    );
    for (const [modality, distance] of [
      ["strength", ""],
      ["cycling", 10],
      ["swimming", 1],
    ]) {
      await ab("reload");
      s = await markForm("Salvar registro");
      await ab("wait", "[name=modality]");
      await field("modality", modality, s, "select");
      await save("Salvar registro", {
        duration_min: 30,
        distance_km: distance,
      });
      await text(
        `${modality === "strength" ? 2 : modality === "cycling" ? 3 : 4} sessões na semana`,
      );
    }
    await count(4);
    await audit("atividades");
  });
  await check(
    "RF006-008 absent versus zero, nutrient totals, confirmation invalidation",
    async () => {
      await goto("/painel/alimentacao");
      await save(
        "Salvar registro",
        { name: "Sem composição QA", amount: 150 },
        "Sem composição QA",
      );
      await count(1);
      assert.equal(
        await evaluate(
          "[...document.querySelectorAll('.nutrition-grid strong')].filter(e=>e.textContent==='Não informado').length",
        ),
        4,
      );
      await clickText("Marcar dia como concluído");
      await text("Dia concluído manualmente.");
      await clickText(
        "Editar registro",
        "summary",
        "document.querySelector('article')",
      );
      await save("Salvar alteração", { kcal: 0 }, "0 kcal");
      await text("Dia ainda não confirmado.");
      await ab("reload");
      await ab("wait", "input[name=amount]");
      await save(
        "Salvar registro",
        {
          name: "Composição QA",
          amount: 150,
          kcal: 200,
          protein: 10,
          carbs: 20,
          fat: 5,
        },
        "300 kcal",
      );
      await count(2);
      await audit("alimentacao");
    },
  );
  await check(
    "RF009 foods, favorites, recipes, recent use and confirmed additive copy",
    async () => {
      await goto("/painel/alimentos");
      await clickText("Cadastrar alimento próprio", "summary");
      await save(
        "Salvar alimento",
        { name: "Aveia QA", kcal: 100, protein: 10 },
        "Alimento salvo",
      );
      await clickText("Favoritar");
      await text("Remover favorito");
      await clickText("Criar receita", "summary");
      const recipeForm = await markForm("Salvar receita");
      await field("recipe_name", "Receita QA", recipeForm);
      await field("portions", 2, recipeForm);
      await clickText("Buscar alimentos");
      await clickText("Incluir Aveia QA");
      await clickText("Salvar receita");
      await text("Receita salva");
      await count(2);
      await field("filtro", "favorite", "", "select");
      await clickText("Filtrar biblioteca");
      await count(1);
      await field("filtro", "", "", "select");
      await clickText("Filtrar biblioteca");
      await count(2);
      await clickText(
        "Usar no diário",
        "summary",
        "[...document.querySelectorAll('article')].find(a=>a.innerText.includes('Receita QA'))",
      );
      await clickText(
        "Adicionar ao diário",
        "button",
        "[...document.querySelectorAll('article')].find(a=>a.innerText.includes('Receita QA'))",
      );
      await text("Alimento adicionado");
      await audit("biblioteca");
      await clickText("Editar alimento", "summary");
      await save("Atualizar alimento", { protein: 99 }, "Alimento salvo");
      assert.equal(
        await evaluate(
          "[...document.querySelectorAll('article')].find(a=>a.querySelector('h2,h3')?.textContent === 'Receita QA').innerText.includes('Proteínas: 10 g')",
        ),
        true,
      );
      await goto("/painel/alimentacao");
      await count(3);
      await clickText("Alimentos recentes", "summary");
      const recentLabel = await evaluate(
        "[...document.querySelectorAll('summary')].find(e=>e.textContent.trim().startsWith('Receita QA · 1 porção')).textContent.trim()",
      );
      await clickText(recentLabel, "summary");
      await clickText("Reutilizar alimento");
      await count(4);
      await clickText("Copiar refeição", "summary");
      const cp = await markForm("Confirmar cópia da refeição");
      await field("target_category", "lunch", cp, "select");
      await clickText("Confirmar cópia da refeição");
      await count(4);
      await ab("check", cp + " input[type=checkbox]");
      await clickText("Confirmar cópia da refeição");
      await text("4 itens");
      await count(8);
      await ab("reload");
      await count(8);
      assert.equal(
        await evaluate(
          "document.querySelector('.nutrition-grid').innerText.includes('50 g')",
        ),
        true,
      );
    },
  );
  await check(
    "RF019 retroactive date and invalid future constrained",
    async () => {
      await goto("/painel/agua");
      await save(
        "Salvar registro",
        { volume_ml: 100, logged_on: "2026-01-02" },
        "Registro adicionado",
      );
      await goto("/painel/agua?data=2026-01-02");
      await count(1);
      await text("100 ml");
      await text("Meta de 2.000 ml");
      const s = await markForm("Salvar registro");
      await field("logged_on", "2099-01-01", s);
      assert.equal(
        await evaluate(
          `${form("Salvar registro")}.querySelector('[name=logged_on]').validity.rangeOverflow`,
        ),
        true,
      );
    },
  );
  await check(
    "RNF012 browser has no unexpected JavaScript exceptions",
    async () => {
      assert.deepEqual((await ab("errors")).errors, []);
    },
  );
  if (!hosted)
    await check(
      "RNF005 recoverable server failure preserves records",
      async () => {
        const hook =
          "http://127.0.0.1:54329/_test/read-failure/00000000-0000-4000-8000-000000000002/";
        await fetch(hook + "on");
        await goto("/painel/agua");
        await text("Não foi possível carregar.");
        await fetch(hook + "off");
        await clickText("Tentar novamente");
        await text("Hidratação.");
        await text("300 ml");
        await count(1);
        report.serverErrorEvents = app.log
          .join("")
          .split("\n")
          .flatMap((line) => {
            try {
              const item = JSON.parse(line);
              return item.event === "request_failed" ? [item] : [];
            } catch {
              return [];
            }
          });
        assert.ok(
          report.serverErrorEvents.some(
            (e) => e.route.includes("/painel") && e.type === "render",
          ),
          "Structured server failure event missing",
        );
        // The previous navigation deliberately raised a server-render error.
        await browserDiagnostics("deliberate read failure and recovery", true);
      },
    );
  await check(
    "RF016-017 upload, private WebP, comparison and confirmed deletion",
    async () => {
      const png = new URL("fixture.png", output);
      await sharp({
        create: { width: 120, height: 180, channels: 3, background: "#FF9F24" },
      })
        .png()
        .toFile(png.pathname);
      await goto("/painel/fotos");
      for (let i = 0; i < 2; i++) {
        if (
          await evaluate(
            "!document.querySelector('input[type=file]').closest('details').open",
          )
        )
          await clickText("Adicionar foto", "summary");
        await ab("upload", "input[type=file]", png.pathname);
        await clickText("Salvar foto");
        await count(i + 1);
      }
      const urls = await evaluate(
        "[...document.querySelectorAll('article img')].map(e=>e.getAttribute('src'))",
      );
      const ids = urls.map((u) => u.split("/").at(-1).split("?")[0]);
      assert.equal((await appFetch(urls[0])).status, 401);
      const response = await evaluate(
        `fetch(${JSON.stringify(urls[0])}).then(async r=>({status:r.status,type:r.headers.get('content-type'),cache:r.headers.get('cache-control')}))`,
      );
      assert.equal(response.status, 200);
      assert.equal(response.type, "image/webp");
      assert.match(response.cache, /no-store/);
      const selects = await evaluate(
        "[...document.querySelectorAll('select')].map(s=>({name:s.name,label:s.labels?.[0]?.textContent}))",
      );
      report.photoSelects = selects;
      await field("a", ids[0], "", "select");
      await field("b", ids[1], "", "select");
      await clickText("Comparar");
      await until(
        "document.querySelectorAll('.comparison-grid img').length===2",
      );
      await audit("fotos");
      await clickText(
        "Excluir foto",
        "summary",
        "document.querySelector('article')",
      );
      const s = await markForm("Excluir foto");
      await ab("check", s + " [name=confirm]");
      await clickText("Excluir foto", "button", form("Excluir foto"));
      await count(1);
      remainingPhotoUrl = await evaluate(
        "document.querySelector('article img').getAttribute('src')",
      );
    },
  );
  await check(
    "RF018 dashboard aggregates and RF022 offline read-only/cache expiry/logout",
    async () => {
      await goto("/painel/agua");
      await ab("wait", "form fieldset");
      await ab("set", "offline", "on");
      await until(
        "[...document.querySelectorAll('form fieldset')].every(e=>e.disabled)",
      );
      await ab("set", "offline", "off");
      await goto("/painel");
      await until("sessionStorage.getItem('diazen-dashboard') !== null");
      await audit("dashboard");
      report.webVitals = await ab("vitals");
      if (!hosted) await until("navigator.serviceWorker.controller !== null");
      else {
        report.previewWorker = {
          controlled: await evaluate(
            "navigator.serviceWorker.controller !== null",
          ),
          scriptWithOidcStatus: (await appFetch("/sw.js")).status,
          scriptWithoutOidcStatus: (await fetch(origin + "/sw.js")).status,
        };
      }
      const paths = await evaluate(
        "(async()=>{const all=[];for(const name of await caches.keys())for(const r of await (await caches.open(name)).keys())all.push(new URL(r.url).pathname);return all})()",
      );
      assert.equal(
        paths.some((p) => p.startsWith("/painel") || p.startsWith("/api/")),
        false,
      );
      if (!hosted) {
        await browserDiagnostics("before deliberate network loss");
        await ab("set", "offline", "on");
        // Also stop this runner's own HTTP process: CDP tab-level emulation
        // does not reliably take the service worker's independent network offline.
        await stop(app.child);
        await ab("open", origin + "/nao-armazenada");
        await text("Você está sem conexão.");
        await text("Auditoria principal");
        await evaluate(
          "(()=>{const d=JSON.parse(sessionStorage.getItem('diazen-dashboard'));d.expiresAt=0;sessionStorage.setItem('diazen-dashboard',JSON.stringify(d));return true})()",
        );
        await ab("reload");
        assert.equal(
          await evaluate("document.querySelector('#summary').hidden"),
          true,
        );
        await ab("set", "offline", "off");
        app = await startApp();
        await goto("/painel");
        await until("sessionStorage.getItem('diazen-dashboard') !== null");
        await browserDiagnostics("deliberate network loss and recovery", true);
      } else
        report.limitations.push(
          "Full service-worker network loss is exercised with the isolated local server stopped; hosted run verifies disabled writes and cache isolation.",
        );
      await goto("/painel");
      await logout();
      assert.equal(
        await evaluate("sessionStorage.getItem('diazen-dashboard')"),
        null,
      );
    },
  );
  await login("registros@example.test");
  await check(
    "RF003-004 completed history read-only and DRAFT blocked",
    async () => {
      await goto("/painel/projetos");
      const s = await markForm("Concluir projeto");
      await clickText("Concluir projeto");
      assert.equal(
        await evaluate("document.querySelector('article .status').textContent"),
        "Em andamento",
      );
      await ab("check", s + " [name=confirm]");
      await clickText("Concluir projeto");
      await until(
        "document.querySelector('article .status')?.textContent === 'Concluído'",
      );
      await goto("/painel/agua");
      await text("Histórico somente leitura.");
      assert.equal(
        await evaluate("document.querySelector('[name=volume_ml]')"),
        null,
      );
      await goto("/painel/projetos");
      const create = await markForm("Criar projeto");
      await ab("check", create + " [name=draft]");
      await save(
        "Criar projeto",
        { name: "Rascunho QA", water_ml: 1800 },
        "Projeto criado",
      );
      await field("estado", "DRAFT", "", "select");
      await clickText("Filtrar projetos");
      await count(1);
      await text("Rascunho QA");
      await clickText("Editar datas do rascunho", "summary");
      await save(
        "Salvar datas",
        { starts_on: "2026-01-01" },
        "Datas do rascunho atualizadas",
      );
      const draftId = await evaluate(
        "document.querySelector('article input[name=id]').value",
      );
      await goto(`/painel/agua?projeto=${draftId}`);
      await text("Rascunhos não recebem registros.");
      assert.equal(
        await evaluate("document.querySelector('[name=volume_ml]')"),
        null,
      );
      await goto("/painel/projetos?estado=DRAFT");
      await clickText("Ativar projeto");
      await count(0);
      await goto("/painel/projetos");
      await text("Em andamento");
    },
  );
  await check(
    "RB03 selected history never changes the destination of global writes",
    async () => {
      const before = await evaluate("fetch('/api/exportar').then(r=>r.json())");
      const active = before.projects.find((p) => p.status === "ACTIVE"),
        old = before.projects.find((p) => p.status === "COMPLETED");
      await goto(`/painel/alimentacao?projeto=${old.id}`);
      await text("Histórico somente leitura.");
      await goto("/painel/alimentos");
      await clickText(
        "Usar no diário",
        "summary",
        "[...document.querySelectorAll('article')].find(a=>a.querySelector('h2,h3')?.textContent === 'Aveia QA')",
      );
      await clickText(
        "Adicionar ao diário",
        "button",
        "[...document.querySelectorAll('article')].find(a=>a.querySelector('h2,h3')?.textContent === 'Aveia QA')",
      );
      await text("Alimento adicionado");
      const after = await evaluate("fetch('/api/exportar').then(r=>r.json())");
      const added = after.meal_items.filter(
        (row) => !before.meal_items.some((old) => old.id === row.id),
      );
      assert.equal(added.length, 1);
      assert.equal(added[0].project_id, active.id);
    },
  );
  await check(
    "RNF002/RB10 second user cannot read another account's projects, photos or export",
    async () => {
      await goto("/painel/perfil");
      const own = await evaluate("fetch('/api/exportar').then(r=>r.json())");
      await logout();
      await login("teste@example.test");
      const projectStatus = await evaluate(
        `fetch('/painel?projeto=${own.projects[0].id}').then(r=>r.status)`,
      );
      // App Router can stream a not-found segment after sending HTTP 200.
      // Assert the rendered denial and absence of the owner's data as well.
      report.foreignProjectPageHttpStatus = projectStatus;
      await goto(`/painel?projeto=${own.projects[0].id}`);
      await text("Vamos voltar ao seu dia?");
      assert.equal(
        await evaluate(
          "document.body.innerText.includes('Auditoria principal')",
        ),
        false,
      );
      assert.equal(
        await evaluate(
          `fetch(${JSON.stringify(remainingPhotoUrl)}).then(r=>r.status)`,
        ),
        404,
      );
      const other = await evaluate("fetch('/api/exportar').then(r=>r.json())");
      for (const name of [
        "projects",
        "photos",
        "meal_items",
        "food_library",
        "weights",
        "measurements",
        "activities",
        "water_entries",
      ])
        assert.equal(other[name].length, 0, name);
      await logout();
      await login("registros@example.test");
    },
  );
  await check(
    "RNF011/RF017 pagination keeps totals and photo comparisons across pages",
    async () => {
      await logout();
      await login("teste@example.test");
      await project("Volume QA");
      await goto("/painel/agua");
      for (let i = 1; i <= 25; i++)
        await save("Salvar registro", { volume_ml: 1 }, `${i} ml`);
      await count(20);
      await clickText("Próximos", "a");
      await count(5);
      await text("25 ml");
      const png = (await readFile(new URL("fixture.png", output))).toString(
        "base64",
      );
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
      for (let i = 0; i < 13; i++) {
        const status = await evaluate(
          `(async()=>{const f=new FormData();f.set('logged_on',${JSON.stringify(date)});f.set('category','front');f.set('file',new Blob([Uint8Array.from(atob(${JSON.stringify(png)}),c=>c.charCodeAt(0))],{type:'image/png'}),'synthetic.png');return (await fetch('/api/fotos',{method:'POST',body:f})).status;})()`,
        );
        assert.equal(status, 201);
      }
      await goto("/painel/fotos");
      await count(12);
      const ids = await evaluate(
        "[...document.querySelectorAll('article img')].map(e=>e.getAttribute('src').split('/').at(-1).split('?')[0])",
      );
      await field("a", ids[0], "", "select");
      await field("b", ids[1], "", "select");
      await clickText("Comparar");
      await until(
        "document.querySelectorAll('.comparison-grid img').length===2",
      );
      await clickText("Próximas", "a");
      await count(1);
      const last = await evaluate(
        "document.querySelector('article img').getAttribute('src').split('/').at(-1).split('?')[0]",
      );
      assert.ok(!ids.includes(last));
      await field("b", last, "", "select");
      await clickText("Comparar");
      await until(
        `new URL(location.href).searchParams.get('b') === ${JSON.stringify(last)}`,
      );
      await until(
        `[...document.querySelectorAll('.comparison-grid img')].some(e=>e.getAttribute('src').includes(${JSON.stringify(last)}))`,
      );
      await until(
        "document.querySelectorAll('.comparison-grid img').length===2",
      );
      const comparison = await evaluate(
        "[...document.querySelectorAll('.comparison-grid img')].map(e=>e.getAttribute('src'))",
      );
      assert.ok(comparison.some((u) => u.includes(last)));
      assert.ok(comparison.some((u) => u.includes(ids[0])));
      await goto("/painel/projetos");
      for (let i = 1; i <= 21; i++) {
        const s = await markForm("Criar projeto");
        await ab("check", s + " [name=draft]");
        await save(
          "Criar projeto",
          { name: `Volume rascunho ${i}`, water_ml: 1000 },
          `Volume rascunho ${i}`,
        );
      }
      await field("estado", "DRAFT", "", "select");
      await clickText("Filtrar projetos");
      await count(20);
      await until(
        "new URL(location.href).searchParams.get('estado') === 'DRAFT'",
      );
      await clickText("Próximos projetos", "a");
      await count(1);
      assert.equal(
        await evaluate("new URL(location.href).searchParams.get('estado')"),
        "DRAFT",
      );
      const archived = await evaluate(
        "document.querySelector('article input[name=id]').value",
      );
      await clickText("Arquivar projeto", "summary");
      const s = await markForm("Confirmar arquivamento");
      await ab("check", s + " [name=confirm]");
      await clickText("Confirmar arquivamento");
      await count(0);
      await goto("/painel/projetos?estado=ARCHIVED");
      await count(1);
      await text("Arquivado");
      await goto(`/painel/agua?projeto=${archived}`);
      await text("Histórico somente leitura.");
      assert.equal(
        await evaluate("document.querySelector('[name=volume_ml]')"),
        null,
      );
      const exported = await evaluate(
        "fetch('/api/exportar').then(r=>r.json())",
      );
      assert.equal(
        exported.projects.filter((p) => p.status === "ACTIVE").length,
        1,
      );
      await logout();
      await login("registros@example.test");
    },
  );
  await check(
    "RF020 export and account deletion require password and confirmation",
    async () => {
      await goto("/painel/perfil");
      const exported = await evaluate(
        "fetch('/api/exportar').then(r=>r.json())",
      );
      assert.equal(exported.projects.length, 2);
      assert.equal(exported.food_library.length, 2);
      assert.equal(exported.photos.length, 1);
      await audit("perfil");
      await clickText("Solicitar exclusão da conta", "summary");
      const s = await markForm("Excluir minha conta");
      await ab("check", s + " [name=confirm]");
      await save(
        "Excluir minha conta",
        { password: "incorreta", confirmation: "EXCLUIR" },
        "Confira a senha",
      );
      await save("Excluir minha conta", {
        password: passwordFor("registros@example.test"),
        confirmation: "EXCLUIR",
      });
      await ab("wait", "--url", "**/conta-excluida");
      await goto("/painel");
      assert.equal(await evaluate("location.pathname"), "/entrar");
    },
  );
  await check(
    "RNF007-008 public privacy/terms responsive and accessible",
    async () => {
      for (const path of [
        "/",
        "/cadastro",
        "/recuperar-senha",
        "/privacidade",
        "/termos",
      ]) {
        await goto(path);
        await audit(path === "/" ? "inicio" : path.slice(1));
      }
    },
  );
  assert.deepEqual(
    (await ab("errors")).errors,
    [],
    "Unexpected browser exception after recovery",
  );
  report.passed = true;
} catch (error) {
  let message = error.message;
  for (const a of accounts)
    message = message.replaceAll(a.password, "[redacted]");
  if (process.env.VERCEL_OIDC_TOKEN)
    message = message.replaceAll(process.env.VERCEL_OIDC_TOKEN, "[redacted]");
  report.failure = { check: current, message };
  console.error(`FAIL ${current}: ${message}`);
  try {
    report.snapshot = await ab("snapshot", "-i");
    report.failureBody = await evaluate(
      "document.querySelector('main')?.innerText",
    );
    await ab(
      "screenshot",
      new URL(`${run}-failure.png`, output).pathname,
      "--full",
    );
  } catch {}
  process.exitCode = 1;
} finally {
  for (const used of browserSessions) {
    activeSession = used;
    try {
      await ab("close");
    } catch {}
  }
  for (const c of children.reverse()) {
    await stop(c);
  }
  if (hosted && admin) {
    report.syntheticAccountsPurged = true;
    for (const a of accounts) {
      try {
        const found = await admin.auth.admin.getUserById(a.id);
        if (found.error?.status === 404) continue;
        assert.ok(found.data.user?.id === a.id);
        const pending = await admin
          .from("account_deletions")
          .select("user_id")
          .eq("user_id", a.id)
          .maybeSingle();
        if (!pending.data) {
          const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          assert.ok(
            !(
              await client.auth.signInWithPassword({
                email: a.email,
                password: a.password,
              })
            ).error,
          );
          assert.ok(!(await client.rpc("request_account_deletion")).error);
        }
        assert.equal(await purgeAccount(admin, a.id), true);
      } catch {
        report.syntheticAccountsPurged = false;
        report.passed = false;
        process.exitCode = 1;
      }
    }
    report.ownerAccountTouched = false;
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(
    new URL(`${run}-report.json`, output),
    JSON.stringify(report, null, 2),
  );
  await writeFile(
    new URL(
      hosted ? "latest-hosted-report.json" : "latest-report.json",
      output,
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(`Evidence: artifacts/agent-browser/${run}-report.json`);
}
