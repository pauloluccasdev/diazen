"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import type { FormResult } from "@/components/forms/action-form";
import {
  validateProjectCreation,
  validateProjectGoals,
} from "@/lib/project-validation";
const result = (error = "", message = ""): FormResult => ({ error, message });
export async function createProject(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const validation = validateProjectCreation(form, today());
  const { name, start, end, mode, min, max, water, sessions, draft, errors } =
    validation;
  if (Object.keys(errors).length)
    return {
      error: `Não foi possível criar. ${Object.values(errors)[0]}`,
      message: "",
      fieldErrors: errors,
    };
  const { error } = await client.rpc("create_project", {
    p_name: name,
    p_starts_on: start,
    p_ends_on: end || null,
    p_water_ml: water,
    p_weight_mode: mode,
    p_weight_min: mode === "target" || mode === "range" ? min : null,
    p_weight_max: mode === "range" ? max : null,
    p_sessions: sessions,
    p_activate: !draft,
  });
  if (error) {
    if (error.code === "23505" && error.message.includes("one_active_per_user"))
      return result(
        "Não foi possível criar. Já existe um projeto ativo. Encerre-o antes de ativar outro, ou salve o novo como rascunho.",
      );
    if (error.message.includes("Início futuro"))
      return {
        error:
          "Não foi possível criar. O início está no futuro. Salve como rascunho ou escolha hoje ou uma data anterior.",
        message: "",
        fieldErrors: {
          starts_on:
            "O início está no futuro. Salve como rascunho ou escolha hoje ou uma data anterior.",
        },
      };
    return result(
      "Não foi possível criar. Tente novamente; se o problema persistir, recarregue a página.",
    );
  }
  revalidatePath("/painel", "layout");
  return result(
    "",
    validation.planned
      ? "Projeto criado como rascunho planejado. A partir da data de início, ative-o em Projetos. A ativação não é automática."
      : "Projeto criado. Ele já aparece na lista abaixo.",
  );
}
export async function changeProject(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("id"));
  const status = String(form.get("status"));
  if (!isId(id)) return result("Projeto inválido.");
  if (
    ["COMPLETED", "ARCHIVED"].includes(status) &&
    form.get("confirm") !== "on"
  )
    return result("Confirme que o projeto ficará somente leitura.");
  let update: { status?: string; name?: string };
  if (["ACTIVE", "COMPLETED", "ARCHIVED"].includes(status)) update = { status };
  else {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100)
      return result("Informe um nome de até 100 caracteres.");
    update = { name };
  }
  const { data, error } = await client
    .from("projects")
    .update(update)
    .eq("id", id)
    .select("id");
  if (error?.message.includes("Início futuro"))
    return result(
      "Não foi possível ativar. O início está no futuro. Mantenha como rascunho ou ajuste a data de início.",
    );
  if (error || !data?.length)
    return result(
      "Não foi possível alterar. Confira o estado do projeto, a meta configurada e se já existe outro projeto ativo.",
    );
  revalidatePath("/painel", "layout");
  return result("", "Projeto atualizado.");
}
export async function changeWaterGoal(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("project_id")),
    date = String(form.get("effective_from")),
    target = Number(form.get("target_ml"));
  if (
    !isId(id) ||
    !isDate(date) ||
    !Number.isInteger(target) ||
    target < 100 ||
    target > 15000
  )
    return result("Informe uma data válida e meta entre 100 e 15000 ml.");
  const { error } = await client
    .from("water_goals")
    .upsert(
      { project_id: id, effective_from: date, target_ml: target },
      { onConflict: "project_id,effective_from" },
    );
  if (error)
    return result(
      "Não foi possível atualizar a meta. Versões passadas e projetos encerrados são somente leitura.",
    );
  revalidatePath("/painel", "layout");
  return result("", "Meta de água salva com sua data de vigência.");
}
export async function changeGoals(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("id"));
  if (!isId(id)) return result("Projeto inválido.");
  const { mode, min, max, sessions, errors } = validateProjectGoals(form);
  if (Object.keys(errors).length)
    return {
      error: `Confira as metas. ${Object.values(errors)[0]}`,
      message: "",
      fieldErrors: errors,
    };
  const { data, error } = await client
    .from("projects")
    .update({
      weight_mode: mode,
      weight_min: min,
      weight_max: max,
      sessions_goal: sessions,
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return result(
      "Não foi possível salvar. Confira as metas e mantenha ao menos uma meta mensurável.",
    );
  revalidatePath("/painel", "layout");
  return result("", "Metas atualizadas.");
}

export async function changeDraftDates(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("id") ?? "");
  const start = String(form.get("starts_on") ?? "");
  const end = String(form.get("ends_on") ?? "");
  if (!isId(id) || !isDate(start) || (end && (!isDate(end) || end < start)))
    return result("Confira as datas do rascunho.");
  const { data, error } = await client
    .from("projects")
    .update({ starts_on: start, ends_on: end || null })
    .eq("id", id)
    .eq("status", "DRAFT")
    .select("id");
  if (error || !data?.length)
    return result(
      "Não foi possível alterar. Somente rascunhos aceitam novas datas, e o período deve conter as metas de água já configuradas.",
    );
  revalidatePath("/painel", "layout");
  return result("", "Datas do rascunho atualizadas.");
}
