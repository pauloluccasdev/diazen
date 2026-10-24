import { type OnlineFoodReference, onlineFoodSource } from "./online-food.ts";
import {
  tacoFoods,
  tacoPortion,
  tacoSource,
  matchTacoFood,
  tacoName,
  type TacoNutrient,
} from "./taco.ts";
export const planNutrients = ["kcal", "protein", "carbs", "fat"] as const;
export type Composition = Record<TacoNutrient, number | null>;
export type PlanFood = {
  name: string;
  amount: number | null;
  unit: "g" | "ml" | null;
  original: string;
  page: number;
  optional: boolean;
  values: Composition;
  source: string;
  tacoId: number | null;
};
export type PlanGroup = {
  choices: PlanFood[];
  selected: number;
  included: boolean;
};
export type PlanMeal = {
  name: string;
  option: number;
  conditional: boolean;
  enabled: boolean;
  groups: PlanGroup[];
};
export type DietPlan = { version: 1; title: string; meals: PlanMeal[] };
export const emptyComposition = (): Composition => ({
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
});
const numeric = (s: string) => Number(s.replace(",", "."));
export function metricQuantity(raw: string): {
  amount: number | null;
  unit: "g" | "ml" | null;
} {
  const metric = raw.match(/(?:^|\(|\s)(\d+(?:[.,]\d+)?)\s*(ml|g)\)?\s*$/i);
  return metric
    ? {
        amount: numeric(metric[1]),
        unit: metric[2].toLowerCase() as "g" | "ml",
      }
    : { amount: null, unit: null };
}
function makeFood(name: string, raw: string, page: number): PlanFood {
  return {
    name,
    ...metricQuantity(raw),
    original: raw,
    page,
    optional: /\*opci/i.test(name),
    values: emptyComposition(),
    source: "",
    tacoId: null,
  };
}
// Layout-aware lines preserve the gap between the food and its household measure.
// Known table formats only; all extracted rows require an explicit human review.
export function parseDietPages(pages: string[]): DietPlan {
  const meals: PlanMeal[] = [];
  let current: PlanMeal | null = null;
  let stopped = false;
  for (const [pageIndex, text] of pages.entries()) {
    const lines = text.normalize("NFKC").split("\n");
    const named = lines.findIndex((line) =>
      /^Refeição \d+(?:\s*-\s*Opção \d+)?$|^Pré-treino \(longo ou intervalado\)$/.test(
        line.trim(),
      ),
    );
    if (named >= 0) {
      const heading = lines[named].trim();
      const match = heading.match(/^Refeição (\d+)(?:\s*-\s*Opção (\d+))?$/);
      const name = match
        ? `Refeição ${match[1]}`
        : "Pré-treino (longo ou intervalado)";
      current = {
        name,
        option: Number(match?.[2] ?? 1),
        conditional: !match,
        enabled: Boolean(match) && !meals.some((m) => m.name === name),
        groups: [],
      };
      meals.push(current);
      for (const line of lines.slice(named + 1)) {
        const value = line.trim();
        if (/substituição para|^Observações:|^Página /.test(value)) break;
        const columns = value.split(/\s{2,}/);
        if (columns.length !== 2) continue;
        const food = makeFood(columns[0], columns[1], pageIndex + 1);
        current.groups.push({
          choices: [food],
          selected: 0,
          included: !food.optional,
        });
      }
      const body = lines.slice(named + 1).join("\n");
      for (const block of body.matchAll(
        /•\s*Op[cç]ões de substituição para\s+(.+?):\s*\n([\s\S]*?)(?=\n\s*•|\n\s*Observações:|\n\s*Página |$)/g,
      )) {
        const group = current.groups.find(
          (g) => g.choices[0].name === block[1].trim(),
        );
        if (!group) continue;
        for (const entry of block[2]
          .replace(/\s+/g, " ")
          .trim()
          .split(/\s*-\s*ou\s*-\s*/)) {
          const split = entry.lastIndexOf(" - ");
          if (split >= 0)
            group.choices.push(
              makeFood(
                entry.slice(0, split),
                entry.slice(split + 3),
                pageIndex + 1,
              ),
            );
        }
      }
      continue;
    }
    for (const raw of lines) {
      const line = raw.trim();
      if (line === "Suplementação") stopped = true;
      if (stopped) continue;
      const title = line.match(/^(.+?)\s*•\s*(\d\d:\d\d)$/);
      if (title) {
        current = {
          name: title[1],
          option: 1,
          conditional: false,
          enabled: true,
          groups: [],
        };
        meals.push(current);
        continue;
      }
      const row = line.match(
        /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|ml)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/,
      );
      if (!row || !current) continue;
      const alternative = row[1].startsWith("ou ");
      const food = makeFood(
        alternative ? row[1].slice(3) : row[1],
        `${row[2]} ${row[3]}`,
        pageIndex + 1,
      );
      food.values = {
        kcal: numeric(row[4]),
        protein: numeric(row[5]),
        carbs: numeric(row[6]),
        fat: numeric(row[7]),
      };
      food.source = `Valores informados no PDF, página ${pageIndex + 1}; porção original ${food.original}`;
      if (alternative) current.groups.at(-1)?.choices.push(food);
      else
        current.groups.push({ choices: [food], selected: 0, included: true });
    }
  }
  if (!meals.length || meals.some((m) => !m.groups.length))
    throw new Error(
      "Não reconhecemos as tabelas deste PDF. Use um PDF com texto selecionável nos formatos de plano suportados.",
    );
  return analyzeDietPlan({ version: 1, title: "Meu plano alimentar", meals });
}
export function analyzeDietPlan(plan: DietPlan): DietPlan {
  return {
    ...plan,
    meals: plan.meals.map((meal) => ({
      ...meal,
      groups: meal.groups.map((group) => ({
        ...group,
        choices: group.choices.map((food) => {
          if (
            food.tacoId !== null ||
            food.source ||
            planNutrients.some((key) => food.values[key] !== null)
          )
            return food;
          const match = matchTacoFood(food.name);
          return match
            ? { ...food, tacoId: match.id, source: tacoSource(match) }
            : food;
        }),
      })),
    })),
  };
}
export function applyPlanReference(
  plan: DietPlan,
  name: string,
  tacoId: number,
): DietPlan {
  const taco = tacoFoods.find((food) => food.id === tacoId);
  if (!taco) return plan;
  return {
    ...plan,
    meals: plan.meals.map((meal) => ({
      ...meal,
      groups: meal.groups.map((group) => ({
        ...group,
        choices: group.choices.map((food) =>
          tacoName(food.name) === tacoName(name) &&
          food.tacoId === null &&
          !food.source &&
          planNutrients.every((key) => food.values[key] === null)
            ? { ...food, tacoId: taco.id, source: tacoSource(taco) }
            : food,
        ),
      })),
    })),
  };
}
export function applyOnlinePlanReference(
  plan: DietPlan,
  current: PlanFood,
  reference: OnlineFoodReference,
): DietPlan {
  return {
    ...plan,
    meals: plan.meals.map((meal) => ({
      ...meal,
      groups: meal.groups.map((group) => ({
        ...group,
        choices: group.choices.map((food) => {
          const pending =
            food.tacoId === null &&
            !food.source &&
            planNutrients.every((key) => food.values[key] === null);
          if (
            food !== current &&
            !(pending && tacoName(food.name) === tacoName(current.name))
          )
            return food;
          if (food.amount === null || food.unit !== reference.unit) return food;
          const values = Object.fromEntries(
            planNutrients.map((key) => [
              key,
              reference.values[key] === null
                ? null
                : Number(
                    (
                      (reference.values[key]! * food.amount!) /
                      reference.amount
                    ).toFixed(3),
                  ),
            ]),
          ) as Composition;
          return {
            ...food,
            tacoId: null,
            source: onlineFoodSource(reference),
            values,
          };
        }),
      })),
    })),
  };
}
export function foodComposition(food: PlanFood): Composition {
  if (food.amount === null || food.unit === null) return emptyComposition();
  if (food.tacoId !== null) {
    const taco = tacoFoods.find((f) => f.id === food.tacoId);
    return taco && food.unit === "g" && food.amount !== null && food.amount > 0
      ? tacoPortion(taco, food.amount)
      : emptyComposition();
  }
  return food.values;
}
export function planTotals(meals: PlanMeal[]) {
  const foods = meals
    .filter((m) => m.enabled)
    .flatMap((m) =>
      m.groups.filter((g) => g.included).map((g) => g.choices[g.selected]),
    );
  return Object.fromEntries(
    planNutrients.map((key) => {
      const values = foods.map((food) => foodComposition(food)[key]);
      const known = values.filter((v): v is number => v !== null);
      return [
        key,
        {
          value: known.length
            ? Number(known.reduce((a, b) => a + b, 0).toFixed(3))
            : null,
          missing: values.length - known.length,
        },
      ];
    }),
  ) as Record<TacoNutrient, { value: number | null; missing: number }>;
}
// Untrusted review data is bounded and rebuilt before persistence; TACO is always recalculated.
export function validatePlan(raw: unknown): DietPlan {
  const text = (v: unknown, max: number) => {
    if (typeof v !== "string" || v.length > max)
      throw new Error("Texto inválido");
    return v;
  };
  const quantity = (v: unknown) => {
    if (v === null) return null;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100000)
      throw new Error("Valor inválido");
    return v;
  };
  if (!raw || typeof raw !== "object") throw new Error("Plano inválido");
  const p = raw as DietPlan;
  const title = text(p.title, 120).trim();
  if (
    !title ||
    p.version !== 1 ||
    !Array.isArray(p.meals) ||
    p.meals.length < 1 ||
    p.meals.length > 30
  )
    throw new Error("Plano inválido");
  let count = 0;
  const meals = p.meals.map((m) => {
    if (
      !Array.isArray(m.groups) ||
      !m.groups.length ||
      m.groups.length > 100 ||
      !Number.isInteger(m.option) ||
      m.option < 1 ||
      m.option > 30 ||
      typeof m.enabled !== "boolean" ||
      typeof m.conditional !== "boolean"
    )
      throw new Error("Refeição inválida");
    return {
      name: text(m.name, 120),
      option: m.option,
      conditional: m.conditional,
      enabled: m.enabled,
      groups: m.groups.map((g) => {
        if (
          !Array.isArray(g.choices) ||
          !g.choices.length ||
          g.choices.length > 50 ||
          !Number.isInteger(g.selected) ||
          g.selected < 0 ||
          g.selected >= g.choices.length ||
          typeof g.included !== "boolean"
        )
          throw new Error("Opção inválida");
        return {
          selected: g.selected,
          included: g.included,
          choices: g.choices.map((f) => {
            if (
              ++count > 1000 ||
              !Number.isInteger(f.page) ||
              f.page < 1 ||
              f.page > 30 ||
              typeof f.optional !== "boolean" ||
              !["g", "ml", null].includes(f.unit)
            )
              throw new Error("Alimento inválido");
            const name = text(f.name, 200).trim(),
              amount = quantity(f.amount);
            if (!name || amount === 0) throw new Error("Porção inválida");
            const taco =
              f.tacoId === null
                ? null
                : tacoFoods.find((t) => t.id === f.tacoId);
            if (f.tacoId !== null && !taco) throw new Error("TACO inválida");
            const values = Object.fromEntries(
              planNutrients.map((k) => [k, quantity(f.values?.[k])]),
            ) as Composition;
            const source = taco ? tacoSource(taco) : text(f.source, 300);
            if (!source && planNutrients.some((k) => values[k] !== null))
              throw new Error("Identifique a fonte dos valores informados");
            return {
              name,
              amount,
              unit: f.unit,
              original: text(f.original, 200),
              page: f.page,
              optional: f.optional,
              tacoId: taco?.id ?? null,
              source,
              values: taco ? emptyComposition() : values,
            };
          }),
        };
      }),
    };
  });
  const active = meals.filter((m) => m.enabled).map((m) => m.name);
  if (!active.length || new Set(active).size !== active.length)
    throw new Error("Selecione somente uma opção por refeição");
  if (!meals.some((m) => m.enabled && m.groups.some((g) => g.included)))
    throw new Error("Inclua pelo menos um alimento no cenário");
  return { version: 1, title, meals };
}
