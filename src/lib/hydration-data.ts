import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry } from "./records";
import type { WaterContainer } from "./water-containers";
import { shiftDay } from "./dashboard-metrics";

export async function waterContainers(client: SupabaseClient) {
  const { data, error } = await client
    .from("water_containers")
    .select("id,name,volume_ml")
    .order("created_at")
    .order("id")
    .range(0, 49)
    .returns<WaterContainer[]>();
  if (error) throw Error("Não foi possível carregar seus recipientes.");
  return data ?? [];
}

export async function hydrationEntries(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const rows: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("water_entries")
      .select("id,logged_on,volume_ml")
      .eq("project_id", project)
      .gte("logged_on", shiftDay(date, -6))
      .lte("logged_on", date)
      .order("id")
      .range(offset, offset + 999)
      .returns<Entry[]>();
    if (error) throw Error("Não foi possível carregar a semana de hidratação.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}
