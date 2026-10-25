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
function run(apply, fail = false, smtp = true) {
  const directory = mkdtempSync(join(tmpdir(), "diazen-auth-config-"));
  try {
    const loader = join(directory, "mock.mjs");
    writeFileSync(
      loader,
      `
      import { readdirSync, readFileSync, writeFileSync } from "node:fs";
      const initial = {site_url:"https://old.example",uri_allow_list:"https://old.example/**",smtp_host:"smtp.example",smtp_user:"mail",smtp_admin_email:"sender@example.com",smtp_pass:"provider-secret-do-not-log",mailer_autoconfirm:false};
      if (process.env.AUTH_CONFIG_TEST_SMTP === "0") { initial.smtp_host = ""; initial.smtp_user = ""; initial.smtp_admin_email = ""; }
      let config = {...initial}; const calls = [];
      globalThis.fetch = async (url, options) => {
        if (url !== "https://api.supabase.com/v1/projects/testproject/config/auth") throw Error("Unexpected request");
        calls.push(options.method);
        if (options.method === "PATCH") {
          const directories = readdirSync("backups");
          const previous = JSON.parse(readFileSync("backups/"+directories[0]+"/previous.json", "utf8"));
          if (previous.site_url !== initial.site_url) throw Error("Backup missing before mutation");
          const payload = JSON.parse(options.body);
          if (!initial.smtp_host && Object.keys(payload).some(key => key.startsWith("mailer_subjects_") || key.startsWith("mailer_templates_") || key === "smtp_sender_name")) return Response.json({message:"Custom SMTP required"}, {status:400});
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
          AUTH_CONFIG_TEST_SMTP: smtp ? "1" : "0",
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
    "https://diazen.example/auth/confirmar,https://diazen.example/auth/recuperar,http://localhost:3000/auth/confirmar,http://localhost:3000/auth/recuperar",
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

test("SMTP padrão aplica URLs sem alterar templates, assuntos ou remetente", () => {
  const { result, data } = run(true, false, false);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(data.calls, ["GET", "PATCH", "GET"]);
  assert.equal(data.config.site_url, "https://diazen.example");
  assert.equal(data.config.smtp_sender_name, undefined);
  assert.equal(data.config.mailer_templates_confirmation_content, undefined);
  assert.equal(data.config.mailer_templates_recovery_content, undefined);
  assert.equal(data.config.mailer_subjects_confirmation, undefined);
  assert.equal(data.config.mailer_subjects_recovery, undefined);
  assert.match(result.stdout, /"customSmtpConfigured":false/);
  assert.match(result.stdout, /"emailTemplates":"provider_default"/);
  assert.match(result.stdout, /"verified":true/);
});
