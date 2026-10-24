"use server";
import { requireAccount } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import { categories } from "@/lib/records";
import {
  mealFoods,
  changedPortion,
  registrationItems,
  type MealFood,
} from "@/lib/meal-registration";
import type { DietPlan } from "@/lib/diet-plan";
import { revalidatePath } from "next/cache";
export async function registerMeal(input: {
  request: string;
  date: string;
  category: string;
  plan: string | null;
  index: number | null;
  amounts: (number | null)[];
  units?: ("g" | "ml" | null)[];
  foods: MealFood[];
}) {
  const { client } = await requireAccount();
  try {
    if (
      !isId(input.request) ||
      !isDate(input.date) ||
      input.date > today() ||
      !Object.hasOwn(categories, input.category)
    )
      throw Error("Confira a data e a refeição.");
    let foods = input.foods;
    if (input.plan !== null) {
      if (
        !isId(input.plan) ||
        !Number.isInteger(input.index) ||
        input.index! < 0
      )
        throw Error("Plano inválido.");
      const version = await client
        .from("diet_plans")
        .select("document")
        .eq("id", input.plan)
        .maybeSingle();
      if (version.error || !version.data) throw Error("Plano indisponível.");
      const meal = (version.data.document as DietPlan).meals[input.index!];
      if (!meal?.enabled) throw Error("Opção não incluída no plano.");
      foods = mealFoods(meal);
      if (input.amounts.length !== foods.length)
        throw Error("Confira as porções.");
      foods = foods.map((food, i) => {
        const unit = food.unit ?? input.units?.[i];
        if (unit !== "g" && unit !== "ml")
          throw Error("Confira a unidade das porções.");
        return changedPortion({ ...food, unit }, input.amounts[i]);
      });
    } else if (input.index !== null) throw Error("Refeição inválida.");
    const items = registrationItems(foods);
    const result = await client.rpc("register_meal", {
      p_request: input.request,
      p_date: input.date,
      p_category: input.category,
      p_items: items,
      p_plan: input.plan,
      p_meal: input.index,
    });
    if (result.error)
      return {
        error:
          "Não foi possível registrar. Confira as porções, a data e se esta refeição já foi registrada no projeto ativo.",
      };
    revalidatePath("/painel", "layout");
    return {
      message:
        "Refeição registrada. As calorias do diário e do dashboard foram atualizadas.",
    };
  } catch {
    return {
      error: "Confira os alimentos, as unidades e as porções da refeição.",
    };
  }
}
