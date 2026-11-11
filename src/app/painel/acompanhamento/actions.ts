"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import { categories } from "@/lib/records";
import {
  checkinScales,
  eatingContexts,
  reflectionFields,
} from "@/lib/daily-followup";
import type { FormResult } from "@/components/forms/action-form";
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
function optionalNumber(
  form: FormData,
  key: string,
  max: number,
  integer = true,
) {
  const raw = text(form, key);
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw Error("Confira as escalas e quantidades.");
  return n;
}
function optionalText(form: FormData, key: string, max = 500) {
  const value = text(form, key);
  if (value.length > max) throw Error("Reduza o texto ao limite indicado.");
  return value || null;
}
function dateFrom(form: FormData) {
  const date = text(form, "logged_on");
  if (!isDate(date) || date > today())
    throw Error("Confira a data do registro.");
  return date;
}
function success(message: string): FormResult {
  revalidatePath("/painel", "layout");
  return { error: "", message };
}
function failure(error: unknown): FormResult {
  return {
    error:
      error instanceof Error
        ? error.message
        : "Não foi possível salvar. Tente novamente.",
    message: "",
  };
}
export async function saveCheckin(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  try {
    const date = dateFrom(form),
      values: Record<string, number | string | null> = {
        sleep_hours: optionalNumber(form, "sleep_hours", 24, false),
      };
    for (const key of Object.keys(checkinScales))
      values[key] = optionalNumber(form, key, 4);
    for (const key of Object.keys(reflectionFields))
      values[key] = optionalText(form, key);
    if (Object.values(values).every((v) => v === null))
      throw Error(
        "Preencha pelo menos uma informação. O restante pode ficar em branco.",
      );
    const { error } = await client.rpc("save_daily_checkin", {
      p_date: date,
      p_values: values,
    });
    if (error)
      throw Error(
        "Não foi possível salvar. Confira a vigência e o projeto ativo.",
      );
    return success("Check-in salvo. Você pode completar ou revisar depois.");
  } catch (error) {
    return failure(error);
  }
}
export async function saveEatingContext(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  try {
    const date = dateFrom(form),
      id = text(form, "request_id"),
      context = text(form, "context"),
      category = text(form, "category");
    if (
      !isId(id) ||
      !Object.hasOwn(eatingContexts, context) ||
      (category && !Object.hasOwn(categories, category))
    )
      throw Error("Confira o contexto e a refeição.");
    const data = {
      id,
      logged_on: date,
      context,
      category: category || null,
      hunger: optionalNumber(form, "hunger", 10),
      satiety: optionalNumber(form, "satiety", 10),
      triggers: optionalText(form, "triggers", 300),
      notes: optionalText(form, "notes"),
    };
    const active = await client
      .from("projects")
      .select("id")
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (active.error || !active.data)
      throw Error("Ative um projeto para registrar.");
    // Identificador estável para uma repetição após resposta perdida; não altera eventos anteriores.
    const existing = await client
      .from("eating_context_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) throw Error("Não foi possível conferir o registro.");
    if (existing.data) {
      if (
        existing.data.project_id !== active.data.id ||
        Object.entries(data).some(([k, v]) => existing.data[k] !== v)
      )
        throw Error(
          "Esta tentativa já foi utilizada. Reabra o formulário para um novo contexto.",
        );
    } else {
      const { error } = await client
        .from("eating_context_events")
        .insert({ ...data, project_id: active.data.id });
      if (error)
        throw Error(
          "Não foi possível registrar. Confira a vigência e tente novamente.",
        );
    }
    return success(
      "Contexto registrado. Nenhuma refeição ou meta foi alterada.",
    );
  } catch (error) {
    return failure(error);
  }
}
export async function deleteDailyRecord(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = text(form, "id"),
    kind = text(form, "kind");
  if (
    !isId(id) ||
    form.get("confirm") !== "on" ||
    !["daily_checkins", "eating_context_events", "project_phases"].includes(
      kind,
    )
  )
    return failure(Error("Confirme a exclusão deste registro."));
  const result = await client.from(kind).delete().eq("id", id).select("id");
  if (result.error || !result.data?.length)
    return failure(Error("Não foi possível excluir. Confira o projeto ativo."));
  return success("Registro excluído.");
}
export async function saveDisplayPreferences(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client, user } = await requireAccount();
  const { error } = await client.from("display_preferences").upsert(
    {
      user_id: user.id,
      show_weight: form.get("show_weight") === "on",
      show_calories: form.get("show_calories") === "on",
      show_photos: form.get("show_photos") === "on",
    },
    { onConflict: "user_id" },
  );
  if (error)
    return failure(Error("Não foi possível salvar suas preferências."));
  return success("Preferências salvas. Seus registros foram preservados.");
}
export async function savePhase(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  try {
    const id = text(form, "id"),
      name = text(form, "name"),
      objective = text(form, "objective"),
      start = text(form, "starts_on"),
      end = text(form, "ends_on"),
      milestone = optionalText(form, "milestone", 120),
      milestoneDate = text(form, "milestone_on") || null;
    if (
      (id && !isId(id)) ||
      !name ||
      name.length > 100 ||
      !objective ||
      objective.length > 500 ||
      !isDate(start) ||
      !isDate(end) ||
      start > end ||
      Boolean(milestone) !== Boolean(milestoneDate) ||
      (milestoneDate &&
        (!isDate(milestoneDate) ||
          milestoneDate < start ||
          milestoneDate > end))
    )
      throw Error("Confira nome, objetivo, período e data do marco.");
    const data = {
      name,
      objective,
      starts_on: start,
      ends_on: end,
      milestone,
      milestone_on: milestoneDate,
    };
    const active = await client
      .from("projects")
      .select("id")
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (active.error || !active.data)
      throw Error("Ative um projeto para configurar fases.");
    const result = id
      ? await client
          .from("project_phases")
          .update(data)
          .eq("id", id)
          .eq("project_id", active.data.id)
          .select("id")
      : await client
          .from("project_phases")
          .insert({ ...data, project_id: active.data.id })
          .select("id");
    if (result.error || !result.data?.length)
      throw Error(
        "Não foi possível salvar. Confira a vigência do projeto e se existe sobreposição com outra fase.",
      );
    return success("Fase salva. Os registros existentes foram preservados.");
  } catch (error) {
    return failure(error);
  }
}
