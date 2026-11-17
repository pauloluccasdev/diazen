import {
  analyzePlanFood,
  foodComposition,
  planNutrients,
  type PlanFood,
  type PlanMeal,
} from "./diet-plan.ts";
import { units } from "./records.ts";
export type MealFood = Omit<PlanFood, "unit"> & {
  unit: keyof typeof units | null;
};
export const mealComposition = (food: MealFood) =>
  food.amount === 0
    ? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    : food.unit === "g" || food.unit === "ml" || food.unit === null
      ? foodComposition(food as PlanFood)
      : food.values;
export const newMealFood = (): MealFood => ({
  name: "",
  amount: null,
  unit: "g",
  original: "Informado no registro",
  page: 1,
  optional: false,
  tacoId: null,
  source: "",
  values: { kcal: null, protein: null, carbs: null, fat: null },
});
export function mealFoods(meal: PlanMeal): MealFood[] {
  return meal.groups
    .filter((g) => g.included)
    .map((g) => ({ ...g.choices[g.selected] }));
}
export function changedPortion(
  food: MealFood,
  amount: number | null,
): MealFood {
  if (amount === 0) return { ...food, amount: 0 };
  if (amount === null)
    return { ...food, amount: null, values: newMealFood().values };
  if (food.tacoId !== null) return { ...food, amount };
  if (food.amount && amount)
    return {
      ...food,
      amount,
      values: Object.fromEntries(
        planNutrients.map((k) => [
          k,
          food.values[k] === null
            ? null
            : Number(((food.values[k]! * amount) / food.amount!).toFixed(3)),
        ]),
      ) as MealFood["values"],
    };
  return analyzePlanFood({
    ...food,
    unit: food.unit === "g" || food.unit === "ml" ? food.unit : null,
    amount,
    source: "",
    values: newMealFood().values,
  });
}
export function registrationItems(foods: MealFood[]) {
  if (!Array.isArray(foods) || !foods.length || foods.length > 100)
    throw Error("Informe entre 1 e 100 alimentos.");
  for (const food of foods) {
    if (
      food.amount === null ||
      !Number.isFinite(food.amount) ||
      food.amount < 0 ||
      food.amount > 100000
    )
      throw Error("Confira os alimentos e as porções.");
  }
  const consumed = foods.filter((food) => food.amount! > 0);
  if (!consumed.length) throw Error("Informe ao menos um alimento consumido.");
  return consumed.map((food) => {
    if (
      !food.name.trim() ||
      !food.amount ||
      !Number.isFinite(food.amount) ||
      food.amount <= 0 ||
      food.amount > 100000 ||
      !food.unit ||
      !Object.hasOwn(units, food.unit)
    )
      throw Error("Confira os alimentos e as porções.");
    const values = mealComposition(food);
    if (
      planNutrients.some(
        (k) =>
          values[k] !== null &&
          (!Number.isFinite(values[k]) ||
            values[k]! < 0 ||
            values[k]! > 100000),
      )
    )
      throw Error("Confira os nutrientes.");
    return {
      name: food.name.trim().slice(0, 120),
      amount: food.amount,
      unit: food.unit,
      reference_amount: food.amount,
      source: (food.source || "Composição não informada").slice(0, 200),
      ...values,
    };
  });
}
