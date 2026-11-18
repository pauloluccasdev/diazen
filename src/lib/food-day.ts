import {
  categories,
  nutrients,
  nutritionTotal,
  type Entry,
  type Nutrient,
} from "./records.ts";

export function groupFoodDay(rows: Entry[]) {
  return Object.entries(categories).map(([category, label]) => {
    const items = rows.filter((row) => row.category === category);
    const totals = Object.fromEntries(
      (Object.keys(nutrients) as Nutrient[]).map((key) => [
        key,
        nutritionTotal(items, key),
      ]),
    ) as Record<Nutrient, ReturnType<typeof nutritionTotal>>;
    return {
      category: category as keyof typeof categories,
      label,
      items,
      totals,
    };
  });
}
export type FoodDayGroup = ReturnType<typeof groupFoodDay>[number];
