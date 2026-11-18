import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "./records";

export async function evolutionEntries(
  client: SupabaseClient,
  project: string,
  date: string,
  kind: "peso" | "medidas",
) {
  const rows: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from(kind === "peso" ? "weights" : "measurements")
      .select(
        kind === "peso"
          ? "id,logged_on,kg"
          : "id,logged_on,measurement_type,value_cm",
      )
      .eq("project_id", project)
      .lte("logged_on", date)
      .order("logged_on", { ascending: false })
      .order("id")
      .range(offset, offset + 999)
      .returns<Entry[]>();
    if (error) throw Error("Não foi possível carregar a evolução corporal.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}
