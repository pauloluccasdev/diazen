import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Ferramenta administrativa local. Não importar no código da aplicação.
try {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const position = args.indexOf("--site-url");
  const site = new URL(position >= 0 ? args[position + 1] : "");
  const local = ["localhost", "127.0.0.1"].includes(site.hostname);
  if (
    site.username ||
    site.password ||
    site.pathname !== "/" ||
    site.search ||
    site.hash ||
    (site.protocol !== "https:" && !(local && site.protocol === "http:"))
  )
    throw new Error("Informe uma origem válida em --site-url, sem caminho.");
  const service = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!/^[a-z0-9]+\.supabase\.co$/.test(service.hostname))
    throw new Error("Esta ferramenta requer um projeto hospedado no Supabase.");
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token)
    throw new Error(
      "Configure SUPABASE_ACCESS_TOKEN localmente; não envie o token no chat.",
    );
  const project = service.hostname.split(".")[0];
  const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  async function request(method, body) {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        `Falha na API de gerenciamento (HTTP ${response.status}).`,
      );
    return response.json();
  }
  const current = await request("GET");
  const customSmtpConfigured = !!(
    current.smtp_host &&
    current.smtp_user &&
    current.smtp_admin_email
  );
  const payload = {
    site_url: site.origin,
    mailer_autoconfirm: false,
    uri_allow_list: [
      ...new Set([
        `${site.origin}/auth/confirmar`,
        `${site.origin}/auth/recuperar`,
        "http://localhost:3000/auth/confirmar",
        "http://localhost:3000/auth/recuperar",
      ]),
    ].join(","),
    password_min_length: 12,
  };
  const changed = Object.keys(payload).filter(
    (key) => payload[key] !== current[key],
  );
  const apply = args.includes("--apply");
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "inspect",
      siteUrl: site.origin,
      changedFields: changed,
      customSmtpConfigured,
      emailTemplates: "provider_default",
      emailConfirmationEnabled: !current.mailer_autoconfirm,
    }),
  );
  if (apply && changed.length) {
    const directory = resolve(
      "backups",
      `auth-config-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const previous = Object.fromEntries(
      Object.keys(payload).map((key) => [key, current[key] ?? null]),
    );
    writeFileSync(
      resolve(directory, "previous.json"),
      JSON.stringify(previous, null, 2) + "\n",
      { mode: 0o600 },
    );
    await request("PATCH", payload);
    const verified = await request("GET");
    if (Object.keys(payload).some((key) => payload[key] !== verified[key]))
      throw new Error(
        "A configuração retornada diverge da solicitada; confira o painel.",
      );
    console.log(
      JSON.stringify({ applied: true, verified: true, backup: directory }),
    );
  }
} catch (error) {
  // Respostas do provedor e valores de configuração nunca entram nos logs.
  const known =
    error instanceof Error &&
    /^(Informe |Esta ferramenta |Configure |Falha na API |A configuração )/.test(
      error.message,
    );
  console.error(
    known
      ? error.message
      : "Não foi possível configurar Auth. Verifique os argumentos e a conexão.",
  );
  process.exitCode = 1;
}
