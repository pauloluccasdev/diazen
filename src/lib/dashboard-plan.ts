import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mealFoods } from "./meal-registration";
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
  const expectedFoods = new Map<number, number>();
  for (let offset = 0; ; offset += 1000) {
    const requests = await client
      .from("food_copy_requests")
      .select("parameters,inserted_count,created_at,id")
      .eq("parameters->>0", "register_meal")
      .eq("parameters->>1", project)
      .eq("parameters->>2", date)
      .eq("parameters->>4", version.data.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 999);
    if (requests.error)
      throw Error("Não foi possível conferir as refeições registradas");
    for (const request of requests.data ?? []) {
      const index = request.parameters?.[5];
      if (
        Number.isInteger(index) &&
        request.inserted_count > 0 &&
        !expectedFoods.has(index)
      )
        expectedFoods.set(index, request.inserted_count);
    }
    if ((requests.data?.length ?? 0) < 1000) break;
  }
  const categories = new Set<string>();
  const registeredMeals = new Set<number>();
  const foodIndices = new Map<number, Set<number>>();
  const mealActuals: Record<number, { value: number | null; missing: number }> =
    {};
  for (let offset = 0; ; offset += 1000) {
    const result = await client
      .from("meal_items")
      .select(
        "category,plan_id,plan_meal_index,plan_food_index,kcal,amount,reference_amount",
      )
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
        const indices =
          foodIndices.get(row.plan_meal_index) ?? new Set<number>();
        indices.add(row.plan_food_index);
        foodIndices.set(row.plan_meal_index, indices);
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
    complete:
      document.meals.some((m) => m.enabled) &&
      document.meals.every(
        (meal, index) =>
          !meal.enabled ||
          (mealFoods(meal).length > 0 &&
            Array.from(
              { length: expectedFoods.get(index) ?? mealFoods(meal).length },
              (_, fi) => fi,
            ).every((fi) => foodIndices.get(index)?.has(fi))),
      ),
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
