import "server-only";
import { validateSupabaseConfiguration } from "../configuration";
export function getSupabaseConfig() {
  // Leitura dinâmica no servidor: permite isolar o ambiente de teste sem
  // incorporar valores do .env.local ao bundle durante o build.
  const environment = process.env;
  // O Next também substitui acessos por alias (.NEXT_PUBLIC_...) no build.
  const url = Reflect.get(environment, "NEXT_PUBLIC_SUPABASE_URL");
  const key = Reflect.get(environment, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return validateSupabaseConfiguration(url, key);
}
