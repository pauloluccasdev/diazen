import { tacoFoods, tacoName, tacoPortion, tacoSource } from "./taco.ts";

// Approved approximate defaults for the plan, not exact name equivalences in
// the TACO catalog. Keep the actual preparation/variety visible in the source.
const defaults: Readonly<Record<string, number>> = {
  arroz: 3,
  "arroz branco": 3,
  "arroz cozido": 3,
  "arroz branco cozido": 3,
  "arroz integral": 1,
  feijao: 561,
  "feijao carioca": 561,
  "feijao preto": 567,
  frango: 410,
  "peito frango": 410,
  "file frango": 410,
  "peito frango grelhado": 410,
  "peito frango cozido": 408,
  abacaxi: 164,
  ameixa: 172,
  goiaba: 200,
  kiwi: 207,
  melancia: 235,
  melao: 236,
  morango: 239,
  banana: 182,
  mamao: 226,
  maca: 222,
  manga: 231,
  uva: 256,
  pera: 243,
  "pao forma": 52,
  "pao forma integral": 52,
  "ovo galinha": 488,
  ovo: 488,
  "ovo cozido": 488,
  "queijo minas": 461,
  mandioca: 129,
  "batata doce": 88,
  "batata baroa": 86,
  "batata inglesa": 91,
  "abobora cabotian": 64,
  "aveia flocos": 7,
  "farinha aveia": 7,
  "carne bovina magra": 377,
  "peixe branco": 282,
};
const labels = [
  {
    names: ["psyllium"],
    name: "Psyllium, Relva Verde",
    amount: 100,
    values: { kcal: 370, protein: 6, carbs: 83, fat: 2 },
    url: "https://www.relvaverde.com.br/produtos/psyllium/",
  },
  {
    names: ["semente chia", "chia"],
    name: "Chia seca, TBCA BRC0402A",
    amount: 100,
    values: { kcal: 442, protein: 16.5, carbs: 7.72, fat: 30.7 },
    url: "https://www.tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0402A",
  },
  {
    names: ["requeijao light", "requeijao cremoso light"],
    name: "Requeijão cremoso com queijos light, Davaca",
    amount: 30,
    values: { kcal: 49, protein: 3.9, carbs: 0, fat: 3.7 },
    url: "https://www.laticiniosdavaca.com.br/produtos/",
  },
] as const;
export function standardPlanReference(name: string) {
  const key = tacoName(name);
  const id = defaults[key];
  if (id) {
    const food = tacoFoods.find((f) => f.id === id)!;
    return {
      values: tacoPortion(food, 100),
      source: `Referência padrão · TACO: ${food.name}; ${tacoSource(food)}`,
      defaultAmount: null,
    };
  }
  const label = labels.find((l) =>
    (l.names as readonly string[]).includes(key),
  );
  if (label)
    return {
      values: Object.fromEntries(
        Object.entries(label.values).map(([k, v]) => [
          k,
          Number(((v * 100) / label.amount).toFixed(6)),
        ]),
      ) as ReturnType<typeof tacoPortion>,
      source: `Referência padrão · ${label.name}; base ${label.amount} g; consultado 24/10/2026; ${label.url}`,
      defaultAmount: null,
    };
  if (
    key.startsWith("salada verduras e legumes") ||
    key === "alface tomate cebola picles etc" ||
    key === "tomate cebola etc"
  ) {
    const foods = [78, 157, 110].map((id) =>
      tacoFoods.find((f) => f.id === id)!,
    );
    const minimum = name.match(/m[ií]nimo\s*(\d+(?:[.,]\d+)?)\s*g/i);
    const defaultAmount = minimum ? Number(minimum[1].replace(",", ".")) : 100;
    return {
      values: Object.fromEntries(
        ["kcal", "protein", "carbs", "fat"].map((k) => {
          const values = foods.map(
            (f) =>
              tacoPortion(f, 100)[k as "kcal" | "protein" | "carbs" | "fat"],
          );
          return [
            k,
            values.some((v) => v === null)
              ? null
              : Number(
                  (values.reduce<number>((a, v) => a + v!, 0) / 3).toFixed(6),
                ),
          ];
        }),
      ) as ReturnType<typeof tacoPortion>,
      source: `Referência padrão · TACO: salada sem molho, partes iguais de alface crespa, tomate e cenoura crus; itens 78/157/110, por 100 g; porção estimada ${defaultAmount} g${minimum ? " (mínimo do PDF)" : ""}`,
      defaultAmount,
    };
  }
  return null;
}
