import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { weekBounds, type Entry } from "./records";
import { caloriesByDate, shiftDay } from "./dashboard-metrics";

export async function dashboardDetails(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const week = weekBounds(date);
  const previous = shiftDay(week.start, -7);
  const [nutrition, recent, firstWeight, latestWeights] = await Promise.all([
    (async () => {
      const rows: Entry[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await client
          .from("meal_items")
          .select("logged_on,kcal,amount,reference_amount")
          .eq("project_id", project)
          .gte("logged_on", previous)
          .lte("logged_on", date)
          .order("id")
          .range(offset, offset + 999)
          .returns<Entry[]>();
        if (result.error)
          throw Error("Não foi possível consultar o comparativo semanal.");
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
      }
      return caloriesByDate(rows);
    })(),
    client
      .from("activities")
      .select(
        "id,name,modality,external_type,duration_min,distance_km,kcal,logged_on,created_at",
      )
      .eq("project_id", project)
      .lte("logged_on", date)
      .order("logged_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .limit(3)
      .returns<Entry[]>(),
    client
      .from("weights")
      .select("id,logged_on,kg")
      .eq("project_id", project)
      .lte("logged_on", date)
      .order("logged_on")
      .limit(1)
      .maybeSingle<Entry>(),
    client
      .from("weights")
      .select("id,logged_on,kg")
      .eq("project_id", project)
      .lte("logged_on", date)
      .order("logged_on", { ascending: false })
      .limit(2)
      .returns<Entry[]>(),
  ]);
  if (recent.error || firstWeight.error || latestWeights.error)
    throw Error("Não foi possível carregar os registros recentes.");
  return {
    weekStart: week.start,
    previousStart: previous,
    nutrition,
    recent: recent.data ?? [],
    firstWeight: firstWeight.data,
    previousWeight: latestWeights.data?.[1] ?? null,
  };
}
export type DashboardDetails = Awaited<ReturnType<typeof dashboardDetails>>;
