import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "./records";

// Summary inputs include the whole day, not only the current editing page.
// RLS and the authenticated caller retain owner/project isolation.
export async function foodDayEntries(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const rows: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("meal_items")
      .select(
        "id,logged_on,category,name,amount,unit,reference_amount,kcal,protein,carbs,fat",
      )
      .eq("project_id", project)
      .eq("logged_on", date)
      .order("id", { ascending: false })
      .range(offset, offset + 999)
      .returns<Entry[]>();
    if (error) throw Error("Não foi possível carregar as refeições do dia.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}
