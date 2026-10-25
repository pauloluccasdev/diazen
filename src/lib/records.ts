export const modules = {
  agua: {
    title: "Hidratação",
    table: "water_entries",
    description: "Cada copo faz parte do caminho.",
  },
  peso: {
    title: "Peso",
    table: "weights",
    description: "Acompanhe sua evolução ao longo do tempo.",
  },
  medidas: {
    title: "Medidas",
    table: "measurements",
    description: "Registre as medidas que fazem sentido para você.",
  },
  atividades: {
    title: "Atividades",
    table: "activities",
    description: "Seu movimento, sem prescrição de treino.",
  },
  alimentacao: {
    title: "Alimentação",
    table: "meal_items",
    description: "Um diário manual das suas refeições.",
  },
} as const;
export type Module = keyof typeof modules;
export const isModule = (value: string): value is Module =>
  Object.hasOwn(modules, value);
export const measurements = {
  waist: "Cintura",
  abdomen: "Abdômen",
  hips: "Quadril",
  chest: "Peito",
  left_arm: "Braço esquerdo",
  right_arm: "Braço direito",
  left_thigh: "Coxa esquerda",
  right_thigh: "Coxa direita",
  left_calf: "Panturrilha esquerda",
  right_calf: "Panturrilha direita",
} as const;
export const modalities = {
  strength: "Musculação",
  running: "Corrida",
  cycling: "Ciclismo",
  swimming: "Natação",
  other: "Outra atividade",
} as const;
export const categories = {
  breakfast: "Café da manhã",
  morning_snack: "Lanche da manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da tarde",
  dinner: "Jantar",
  supper: "Ceia",
} as const;
export const units = {
  g: "g",
  ml: "ml",
  unit: "unidade",
  portion: "porção",
} as const;
export interface Entry {
  id: string;
  user_id: string;
  project_id: string;
  logged_on: string;
  logged_time?: string | null;
  volume_ml?: number;
  container_label?: string | null;
  kg?: number;
  measurement_type?: keyof typeof measurements;
  value_cm?: number;
  modality?: keyof typeof modalities;
  external_provider?: "garmin" | null;
  external_id?: string | null;
  external_type?: string | null;
  duration_min?: number;
  distance_km?: number | null;
  notes?: string | null;
  category?: keyof typeof categories;
  name?: string;
  amount?: number;
  unit?: keyof typeof units;
  reference_amount?: number;
  source?: string;
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}
export function activityModality(row: Entry) {
  if (
    row.modality === "other" &&
    row.external_provider === "garmin" &&
    row.external_type
  ) {
    const labels: Record<string, string> = {
      walking: "Caminhada",
      hiking: "Trilha",
      yoga: "Yoga",
      pilates: "Pilates",
      elliptical: "Elíptico",
      cardio_training: "Cardio",
      fitness_equipment: "Treino",
    };
    return labels[row.external_type] ?? row.external_type.replaceAll("_", " ");
  }
  return row.modality ? modalities[row.modality] : "Atividade";
}
export type Nutrient = "kcal" | "protein" | "carbs" | "fat";
export const nutrients: Record<Nutrient, string> = {
  kcal: "Calorias",
  protein: "Proteínas",
  carbs: "Carboidratos",
  fat: "Gorduras",
};
export function nutritionTotal(rows: Entry[], key: Nutrient) {
  const known = rows.filter((r) => r[key] !== null && r[key] !== undefined);
  return {
    value: known.length
      ? known.reduce(
          (sum, r) =>
            sum +
            (Number(r[key]) * Number(r.amount)) / Number(r.reference_amount),
          0,
        )
      : null,
    missing: rows.length - known.length,
  };
}
export function weekBounds(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const start = day.toISOString().slice(0, 10);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: day.toISOString().slice(0, 10) };
}
export interface Summary {
  water_ml: number | null;
  water_count: number;
  water_goal: number | null;
  weight: number | null;
  weight_date: string | null;
  sessions: number | null;
  food_count: number;
  confirmed: boolean;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  missing_kcal: number;
  missing_protein: number;
  missing_carbs: number;
  missing_fat: number;
}
