import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planTotals, type DietPlan } from "./diet-plan";
export async function dashboardPlan(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const version = await client
    .from("diet_plans")
    .select("document,title")
    .eq("project_id", project)
    .lte("created_at", `${date}T23:59:59.999-03:00`)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(1)
    .maybeSingle();
  if (version.error)
    throw new Error("Não foi possível carregar a comparação alimentar");
  if (!version.data) return null;
  const categories = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const result = await client
      .from("meal_items")
      .select("category")
      .eq("project_id", project)
      .eq("logged_on", date)
      .order("id")
      .range(offset, offset + 999);
    if (result.error)
      throw new Error("Não foi possível carregar as refeições registradas");
    for (const row of result.data ?? []) categories.add(row.category);
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const document = version.data.document as DietPlan;
  return {
    title: version.data.title,
    totals: planTotals(document.meals),
    plannedMeals: document.meals.filter((m) => m.enabled).length,
    recordedMeals: categories.size,
  };
}
