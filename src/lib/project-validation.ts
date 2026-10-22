import { isDate } from "./domain";

export type WeightMode = "none" | "track" | "target" | "range";
export function validateProjectGoals(form: FormData) {
  const errors: Record<string, string> = {};
  const mode = String(form.get("weight_mode") ?? "none");
  const numeric = (key: string) => {
    const value = String(form.get(key) ?? "").trim();
    return value ? Number(value.replace(",", ".")) : null;
  };
  if (!["none", "track", "target", "range"].includes(mode))
    errors.weight_mode = "Escolha um modo de acompanhamento válido.";
  const water = numeric("water_ml"),
    sessions = numeric("sessions");
  // Valores de modos não selecionados não participam da validação ou gravação.
  const min =
    mode === "target" || mode === "range" ? numeric("weight_min") : null;
  const max = mode === "range" ? numeric("weight_max") : null;
  if (
    water !== null &&
    (!Number.isInteger(water) || water < 100 || water > 15000)
  )
    errors.water_ml = "Informe uma meta de água entre 100 e 15000 ml.";
  if (
    sessions !== null &&
    (!Number.isInteger(sessions) || sessions < 1 || sessions > 50)
  )
    errors.sessions = "Informe de 1 a 50 sessões por semana.";
  if (
    (mode === "target" || mode === "range") &&
    (min === null || !Number.isFinite(min) || min < 20 || min > 500)
  )
    errors.weight_min = "Informe o peso alvo ou mínimo entre 20 e 500 kg.";
  if (
    mode === "range" &&
    (max === null ||
      !Number.isFinite(max) ||
      max < 20 ||
      max > 500 ||
      (min !== null && max < min))
  )
    errors.weight_max =
      "Informe o máximo entre 20 e 500 kg, maior ou igual ao mínimo.";
  return { mode: mode as WeightMode, water, sessions, min, max, errors };
}
export function validateProjectCreation(form: FormData, today: string) {
  const goals = validateProjectGoals(form);
  const errors = { ...goals.errors };
  const name = String(form.get("name") ?? "").trim();
  const start = String(form.get("starts_on") ?? "");
  const end = String(form.get("ends_on") ?? "");
  const draft = form.get("draft") === "on";
  if (!name || name.length > 100)
    errors.name = "Informe um nome de até 100 caracteres.";
  if (!isDate(start)) errors.starts_on = "Informe uma data de início válida.";
  else if (!draft && start > today)
    errors.starts_on =
      "O início está no futuro. Escolha hoje ou uma data anterior para ativar, ou salve como rascunho.";
  if (end && (!isDate(end) || (isDate(start) && end < start)))
    errors.ends_on = "O fim previsto deve ser igual ou posterior ao início.";
  if (
    !draft &&
    goals.water === null &&
    goals.sessions === null &&
    goals.mode !== "target" &&
    goals.mode !== "range"
  )
    errors.goals =
      "Para ativar, informe uma meta de água, sessões semanais ou peso alvo/faixa. Apenas acompanhar peso não define uma meta numérica.";
  return { ...goals, errors, name, start, end, draft };
}
