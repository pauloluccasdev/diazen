import dataset from "../data/taco-4.json" with { type: "json" };

export type TacoNutrient = "kcal" | "protein" | "carbs" | "fat";
export type TacoFood = {
  id: number;
  name: string;
  reference_amount: number;
  unit: string;
  pdf_page: number;
  printed_page: number;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  markers: Partial<Record<TacoNutrient, string>>;
};
export const tacoFoods: readonly TacoFood[] = dataset.items;
export const tacoMetadata = dataset.metadata;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const searchable = tacoFoods.map((food) => ({
  food,
  name: normalize(food.name),
}));
export function searchTacoFoods(query: string, limit = 8): TacoFood[] {
  const text = normalize(query.slice(0, 120));
  if (text.length < 2) return [];
  const words = text.split(/\s+/);
  const count = Number.isFinite(limit)
    ? Math.min(20, Math.max(1, Math.floor(limit)))
    : 8;
  return searchable
    .filter((item) => words.every((word) => item.name.includes(word)))
    .slice(0, count)
    .map((item) => item.food);
}
export function tacoSource(food: TacoFood): string {
  return `TACO, NEPA/UNICAMP, 4ª ed. rev. e ampl., 2011; item ${food.id}, p. ${food.printed_page}; por 100 g`;
}
export function tacoPortion(
  food: TacoFood,
  grams: number,
): Record<TacoNutrient, number | null> {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 100000)
    throw new RangeError(
      "Informe a porção em gramas, maior que zero e até 100000.",
    );
  const portion = (value: number | null) =>
    value === null ? null : Number(((value * grams) / 100).toFixed(3));
  return {
    kcal: portion(food.kcal),
    protein: portion(food.protein),
    carbs: portion(food.carbs),
    fat: portion(food.fat),
  };
}
