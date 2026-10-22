import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { validateSupabaseConfiguration } from "../src/lib/configuration.ts";
try {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
} catch {
  console.error("Não foi possível ler .env.local.");
  process.exit(1);
}
const config = validateSupabaseConfiguration(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const secret = process.env.SUPABASE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL;
const status = {
  localEnv: existsSync(".env.local"),
  supabaseConfigurationValid: !!config,
  siteUrlConfigured: !!site,
  adminKeyConfigured: !!secret,
};
console.log(JSON.stringify(status));
if (!config || !site || !secret) {
  process.exitCode = 1;
} else if (process.argv.includes("--connect")) {
  try {
    const client = createClient(config.url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (url, init) =>
          fetch(url, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    });
    const { error } = await client.from("projects").select("id").limit(0);
    const { data: bucket, error: bucketError } =
      await client.storage.getBucket("body-photos");
    console.log(
      JSON.stringify({
        databaseReady: !error,
        databaseErrorCode: error?.code ?? null,
        privatePhotoBucketReady: !bucketError && bucket?.public === false,
      }),
    );
    if (error || bucketError || bucket?.public !== false) process.exitCode = 1;
  } catch {
    console.error(
      "Não foi possível verificar a conexão. Nenhum valor de configuração foi exibido.",
    );
    process.exitCode = 1;
  }
}
