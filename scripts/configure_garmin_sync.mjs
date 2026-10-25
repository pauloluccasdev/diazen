// Operational setup: Supabase Cron calls the private Diazen sync route.
// Credentials are loaded locally and stored encrypted in Vault, never printed.
import { pathToFileURL } from "node:url";
export function garminScheduleSql(site, secret, enabled = false) {
  const url = new URL(site);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9.-]+$/.test(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    typeof secret !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(secret)
  )
    throw Error("Configure origem HTTPS e segredo privado válidos.");
  const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
  const endpoint = url.origin + "/api/garmin/sync";
  const command =
    "select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='diazen_garmin_sync_url'), headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='diazen_garmin_sync_secret'),'Content-Type','application/json'), body := '{}'::jsonb, timeout_milliseconds := 60000);";
  return `begin;
 do $extensions$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') then create extension pg_cron with schema pg_catalog;end if;
 if not exists(select 1 from pg_extension where extname='pg_net') then create extension pg_net with schema extensions;end if;
 end $extensions$;
 grant usage on schema cron to postgres;
 grant all privileges on all tables in schema cron to postgres;
 revoke all on schema net,cron from public,anon,authenticated;
 revoke all on all tables in schema net,cron from public,anon,authenticated;
 revoke all on vault.decrypted_secrets,vault.secrets from public,anon,authenticated;
 do $setup$ declare current_id uuid; begin
 select id into current_id from vault.secrets where name='diazen_garmin_sync_url';
 if current_id is null then perform vault.create_secret(${quote(endpoint)},'diazen_garmin_sync_url');else perform vault.update_secret(current_id,${quote(endpoint)});end if;
 select id into current_id from vault.secrets where name='diazen_garmin_sync_secret';
 if current_id is null then perform vault.create_secret(${quote(secret)},'diazen_garmin_sync_secret');else perform vault.update_secret(current_id,${quote(secret)});end if;
 end $setup$;
 select cron.schedule('diazen-garmin-sync','*/15 * * * *',${quote(command)});
 select cron.alter_job((select jobid from cron.job where jobname='diazen-garmin-sync'),active := ${enabled ? "true" : "false"});
 commit;`;
}
export async function configureGarmin(args = process.argv.slice(2)) {
  process.loadEnvFile(".env.local");
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (
    !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) ||
    !process.env.SUPABASE_ACCESS_TOKEN
  )
    throw Error("Configure o acesso administrativo local ao Supabase.");
  const endpoint = `https://api.supabase.com/v1/projects/${url.hostname.split(".")[0]}/database/query`;
  async function query(sql, read_only) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql, read_only }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw Error(`Falha na configuração: HTTP ${response.status}`);
    return response.json();
  }
  if (args.includes("--apply"))
    await query(
      garminScheduleSql(
        process.env.GARMIN_SYNC_SITE_URL,
        process.env.GARMIN_SYNC_SECRET,
        args.includes("--enable"),
      ),
      false,
    );
  const installed = await query(
    "select exists(select 1 from pg_extension where extname='pg_cron') cron_installed",
    true,
  );
  if (!installed[0]?.cron_installed) {
    console.log(JSON.stringify({ configured: false }));
    return;
  }
  const status = await query(
    "select count(*)=1 as configured,coalesce(bool_and(active),false) as active,coalesce(bool_and(schedule='*/15 * * * *'),false) as every_fifteen_minutes from cron.job where jobname='diazen-garmin-sync'",
    true,
  );
  console.log(JSON.stringify(status[0]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  configureGarmin().catch(() => {
    console.error(
      "Não foi possível configurar a sincronização Garmin. Confira as variáveis locais e os acessos administrativos.",
    );
    process.exitCode = 1;
  });
