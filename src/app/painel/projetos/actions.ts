"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate, isId } from "@/lib/domain";
import type { FormResult } from "@/components/forms/action-form";
const result = (error = "", message = ""): FormResult => ({ error, message });
export async function createProject(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const name = String(form.get("name") ?? "").trim();
  const start = String(form.get("starts_on") ?? "");
  const end = String(form.get("ends_on") ?? "");
  const mode = String(form.get("weight_mode") ?? "none");
  const numeric = (key: string) =>
    form.get(key) ? Number(String(form.get(key)).replace(",", ".")) : null;
  const water = numeric("water_ml"),
    min = numeric("weight_min"),
    max = numeric("weight_max"),
    sessions = numeric("sessions");
  if (
    !name ||
    name.length > 100 ||
    !isDate(start) ||
    (end && (!isDate(end) || end < start))
  )
    return result("Confira nome e datas do projeto.");
  if (
    !["none", "track", "target", "range"].includes(mode) ||
    [water, min, max, sessions].some((v) => v !== null && !Number.isFinite(v))
  )
    return result("Confira as metas informadas.");
  const { error } = await client.rpc("create_project", {
    p_name: name,
    p_starts_on: start,
    p_ends_on: end || null,
    p_water_ml: water,
    p_weight_mode: mode,
    p_weight_min: mode === "target" || mode === "range" ? min : null,
    p_weight_max: mode === "range" ? max : null,
    p_sessions: sessions,
    p_activate: form.get("draft") !== "on",
  });
  if (error)
    return result(
      "Não foi possível criar. Informe pelo menos uma meta mensurável para ativar, confira os valores e encerre o projeto ativo antes de ativar outro.",
    );
  revalidatePath("/painel", "layout");
  return result("", "Projeto criado. Ele já aparece na lista abaixo.");
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
  const id = String(form.get("id")),
    mode = String(form.get("weight_mode"));
  const value = (key: string) =>
    form.get(key) ? Number(String(form.get(key)).replace(",", ".")) : null;
  if (!isId(id) || !["none", "track", "target", "range"].includes(mode))
    return result("Confira as metas.");
  const { data, error } = await client
    .from("projects")
    .update({
      weight_mode: mode,
      weight_min:
        mode === "target" || mode === "range" ? value("weight_min") : null,
      weight_max: mode === "range" ? value("weight_max") : null,
      sessions_goal: value("sessions"),
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
