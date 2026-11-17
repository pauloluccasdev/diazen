export type DisplayPreferences = {
  show_weight: boolean;
  show_calories: boolean;
  show_photos: boolean;
};
export const defaultDisplay: DisplayPreferences = {
  show_weight: true,
  show_calories: true,
  show_photos: true,
};
export type ProjectPhase = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  objective: string;
  milestone: string | null;
  milestone_on: string | null;
};
export const checkinScales = {
  sleep_quality: {
    label: "Qualidade percebida do sono",
    options: ["Muito ruim", "Ruim", "Regular", "Boa", "Muito boa"],
  },
  fatigue: {
    label: "Fadiga",
    options: ["Nenhuma", "Leve", "Moderada", "Alta", "Muito alta"],
  },
  soreness: {
    label: "Dores musculares",
    options: ["Nenhuma", "Leves", "Moderadas", "Altas", "Muito altas"],
  },
  energy: {
    label: "Disposição",
    options: ["Muito baixa", "Baixa", "Regular", "Boa", "Muito boa"],
  },
} as const;
export const reflectionFields = {
  worked: "O que funcionou bem?",
  difficulty: "Qual foi a maior dificuldade?",
  tomorrow: "O que quero adaptar amanhã?",
} as const;
export type DailyCheckin = {
  id: string;
  logged_on: string;
  sleep_hours: number | null;
  worked: string | null;
  difficulty: string | null;
  tomorrow: string | null;
} & Record<keyof typeof checkinScales, number | null>;
export const eatingContexts = {
  routine: "Rotina",
  social: "Refeição social",
  loss_of_control: "Perda de controle percebida",
} as const;
export type EatingContext = {
  id: string;
  logged_on: string;
  context: keyof typeof eatingContexts;
  category: string | null;
  hunger: number | null;
  satiety: number | null;
  triggers: string | null;
  notes: string | null;
};
