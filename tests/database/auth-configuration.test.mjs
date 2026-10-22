import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(
  new URL("../../scripts/configure_supabase_auth.mjs", import.meta.url),
);
function run(apply, fail = false) {
  const directory = mkdtempSync(join(tmpdir(), "diazen-auth-config-"));
  try {
    const loader = join(directory, "mock.mjs");
    writeFileSync(
      loader,
      `
      import { readdirSync, readFileSync, writeFileSync } from "node:fs";
      const initial = {site_url:"https://old.example",uri_allow_list:"https://old.example/**",smtp_host:"smtp.example",smtp_user:"mail",smtp_admin_email:"sender@example.com",smtp_pass:"provider-secret-do-not-log",mailer_autoconfirm:false};
      let config = {...initial}; const calls = [];
      globalThis.fetch = async (url, options) => {
        if (url !== "https://api.supabase.com/v1/projects/testproject/config/auth") throw Error("Unexpected request");
        calls.push(options.method);
        if (options.method === "PATCH") {
          const directories = readdirSync("backups");
          const previous = JSON.parse(readFileSync("backups/"+directories[0]+"/previous.json", "utf8"));
          if (previous.site_url !== initial.site_url) throw Error("Backup missing before mutation");
          const payload = JSON.parse(options.body);
          if ("smtp_pass" in payload || "smtp_host" in payload || "smtp_user" in payload || "smtp_admin_email" in payload) throw Error("SMTP credentials changed");
          if (process.env.AUTH_CONFIG_TEST_FAIL === "1") return new Response(JSON.stringify({secret:"provider-secret-do-not-log"}), {status:403});
          config = {...config,...payload};
        }
        writeFileSync("calls.json",JSON.stringify({calls,config}));
        return Response.json(config);
      };
    `,
    );
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        loader,
        script,
        "--site-url",
        "https://diazen.example",
        ...(apply ? ["--apply"] : []),
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: "test-management-secret",
          NEXT_PUBLIC_SUPABASE_URL: "https://testproject.supabase.co",
          AUTH_CONFIG_TEST_FAIL: fail ? "1" : "0",
        },
        encoding: "utf8",
      },
    );
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /provider-secret-do-not-log|test-management-secret/,
    );
    return {
      result,
      data: JSON.parse(readFileSync(join(directory, "calls.json"), "utf8")),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("inspeção de Auth não altera configuração remota", () => {
  const { result, data } = run(false);
  assert.equal(result.status, 0);
  assert.deepEqual(data.calls, ["GET"]);
  assert.equal(data.config.site_url, "https://old.example");
});

test("aplicação salva backup antes da alteração, preserva SMTP e verifica retorno", () => {
  const { result, data } = run(true);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(data.calls, ["GET", "PATCH", "GET"]);
  assert.equal(data.config.site_url, "https://diazen.example");
  assert.equal(
    data.config.uri_allow_list,
    "https://diazen.example/auth/confirmar,http://localhost:3000/auth/confirmar",
  );
  assert.equal(data.config.smtp_pass, "provider-secret-do-not-log");
  assert.match(result.stdout, /"verified":true/);
});

test("falha administrativa não revela resposta ou confirma aplicação", () => {
  const { result } = run(true, true);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 403/);
  assert.doesNotMatch(result.stdout, /"applied":true|"verified":true/);
});
