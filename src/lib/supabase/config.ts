import "server-only";
import { validateSupabaseConfiguration } from "../configuration";
export function getSupabaseConfig() {
  // Leitura dinâmica no servidor: permite isolar o ambiente de teste sem
  // incorporar valores do .env.local ao bundle durante o build.
  const environment = process.env;
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return validateSupabaseConfiguration(url, key);
}
