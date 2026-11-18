import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { weekBounds, type Entry } from "./records";
import { shiftDay } from "./dashboard-metrics";

export async function trainingEntries(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const week = weekBounds(date);
  const rows: Entry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("activities")
      .select("id,logged_on,modality,duration_min,distance_km,kcal")
      .eq("project_id", project)
      .gte("logged_on", shiftDay(week.start, -7))
      .lte("logged_on", week.end)
      .order("id")
      .range(offset, offset + 999)
      .returns<Entry[]>();
    if (error)
      throw Error("Não foi possível carregar os indicadores dos treinos.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows;
}

export async function recentTraining(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const { data, error } = await client
    .from("activities")
    .select(
      "id,logged_on,modality,name,duration_min,distance_km,kcal,external_provider,external_type",
    )
    .eq("project_id", project)
    .lte("logged_on", date)
    .order("logged_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(4)
    .returns<Entry[]>();
  if (error) throw Error("Não foi possível carregar seus treinos recentes.");
  return data ?? [];
}
