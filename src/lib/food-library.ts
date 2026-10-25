import type { Entry } from "./records";
export type LibraryFood = Pick<
  Entry,
  | "id"
  | "name"
  | "unit"
  | "reference_amount"
  | "source"
  | "kcal"
  | "protein"
  | "carbs"
  | "fat"
> & {
  kind: "food" | "recipe";
  favorite: boolean;
  ingredients: Pick<Entry, "name" | "amount" | "unit" | "source">[] | null;
};
