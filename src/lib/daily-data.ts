import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultDisplay, type DisplayPreferences } from "./daily-followup";
export async function displayPreferences(
  client: SupabaseClient,
  user: string,
): Promise<DisplayPreferences> {
  const result = await client
    .from("display_preferences")
    .select("show_weight,show_calories,show_photos")
    .eq("user_id", user)
    .maybeSingle();
  if (result.error)
    throw Error("Não foi possível carregar suas preferências de exibição.");
  return result.data ?? defaultDisplay;
}
