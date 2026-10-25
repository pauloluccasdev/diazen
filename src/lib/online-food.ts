export type OnlineFoodReference = {
  code: string;
  name: string;
  brand: string;
  amount: number;
  unit: "g" | "ml";
  values: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
};
export type OnlineFoodHit = { code: string; name: string; brand: string };
const text = (v: unknown, max = 120) =>
  typeof v === "string" ? v.slice(0, max).trim() : "";
const number = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000
    ? v
    : null;
export function onlineFoodHit(raw: unknown): OnlineFoodHit | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>,
    code = text(p.code, 100);
  const name =
    text(p.product_name) || text(p.product_name_pt) || text(p.product_name_en);
  const brand = Array.isArray(p.brands)
    ? p.brands
        .map((x) => text(x, 40))
        .join(", ")
        .slice(0, 80)
    : text(p.brands, 80);
  return /^\d{8,14}$/.test(code) && name ? { code, name, brand } : null;
}
export function onlineFoodReference(raw: unknown): OnlineFoodReference | null {
  const hit = onlineFoodHit(raw);
  if (!hit) return null;
  const product = raw as { nutrition?: { input_sets?: unknown[] } };
  const inputs = Array.isArray(product.nutrition?.input_sets)
    ? product.nutrition.input_sets
    : [];
  const sets = inputs
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const s = raw as {
        source?: string;
        preparation?: string;
        per?: string;
        per_unit?: string;
        per_quantity?: number;
        nutrients?: Record<
          string,
          { value?: number; unit?: string; modifier?: string }
        >;
      };
      if (s.source !== "packaging" || s.preparation !== "as_sold") return [];
      const unit =
        s.per_unit ??
        (s.per === "100g" ? "g" : s.per === "100ml" ? "ml" : null);
      const amount = number(
        s.per_quantity ?? (s.per === "100g" || s.per === "100ml" ? 100 : null),
      );
      if (!amount || !["g", "ml"].includes(unit ?? "")) return [];
      const read = (key: string, unit: string) => {
        const n = s.nutrients?.[key];
        return n && !n.modifier && n.unit === unit ? number(n.value) : null;
      };
      const values = {
        kcal: read("energy-kcal", "kcal"),
        protein: read("proteins", "g"),
        carbs: read("carbohydrates", "g"),
        fat: read("fat", "g"),
      };
      const count = Object.values(values).filter((v) => v !== null).length;
      return count
        ? [{ ...hit, amount, unit: unit as "g" | "ml", values, count }]
        : [];
    })
    .sort((a, b) => b.count - a.count);
  if (!sets.length) return null;
  const { count: unused, ...reference } = sets[0];
  void unused;
  return reference;
}
export const onlineFoodUrl = (code: string) =>
  `https://world.openfoodfacts.org/product/${code}`;
export function onlineFoodSource(r: OnlineFoodReference): string {
  return `Referência padrão · Open Food Facts: ${r.name.slice(0, 70)}${r.brand ? ` (${r.brand.slice(0, 35)})` : ""}; base ${r.amount} ${r.unit}; ${onlineFoodUrl(r.code)}`;
}
