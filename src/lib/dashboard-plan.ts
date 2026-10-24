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
    .select("id,document,title")
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
  const registeredMeals = new Set<number>();
  const mealActuals: Record<number, { value: number | null; missing: number }> =
    {};
  for (let offset = 0; ; offset += 1000) {
    const result = await client
      .from("meal_items")
      .select("category,plan_id,plan_meal_index,kcal,amount,reference_amount")
      .eq("project_id", project)
      .eq("logged_on", date)
      .order("id")
      .range(offset, offset + 999);
    if (result.error)
      throw new Error("Não foi possível carregar as refeições registradas");
    for (const row of result.data ?? []) {
      categories.add(row.category);
      if (
        row.plan_id === version.data.id &&
        Number.isInteger(row.plan_meal_index)
      ) {
        registeredMeals.add(row.plan_meal_index);
        const actual = mealActuals[row.plan_meal_index] ?? {
          value: null,
          missing: 0,
        };
        if (row.kcal === null) actual.missing++;
        else
          actual.value =
            (actual.value ?? 0) +
            (Number(row.kcal) * Number(row.amount)) /
              Number(row.reference_amount);
        mealActuals[row.plan_meal_index] = actual;
      }
    }
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const document = version.data.document as DietPlan;
  return {
    id: version.data.id,
    document,
    registeredMeals: [...registeredMeals],
    mealActuals,
    title: version.data.title,
    totals: planTotals(document.meals),
    plannedMeals: document.meals.filter((m) => m.enabled).length,
    recordedMeals: categories.size,
  };
}
