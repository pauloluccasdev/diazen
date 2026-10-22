import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
export function createAdminClient() {
  const config=getSupabaseConfig(),secret=process.env.SUPABASE_SECRET_KEY;
  if(!config||!secret)return null;
  return createClient(config.url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
