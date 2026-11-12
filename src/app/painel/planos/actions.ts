"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import { validatePhasePlan, type PlanKind } from "@/lib/phase-plans";
import type { FormResult } from "@/components/forms/action-form";
import { cleanPlanAssetJobs } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";
const fail = (error: string): FormResult => ({ error, message: "" });
export async function savePhasePlan(input: {
  id: string;
  kind: PlanKind;
  title: string;
  effective_from: string;
  phase_id: string | null;
  reference_image_id: string | null;
  document: unknown;
}) {
  const { client } = await requireAccount();
  try {
    if (
      !isId(input.id) ||
      !["hydration", "strength"].includes(input.kind) ||
      !input.title.trim() ||
      input.title.trim().length > 120 ||
      !isDate(input.effective_from) ||
      (input.phase_id && !isId(input.phase_id)) ||
      (input.reference_image_id && !isId(input.reference_image_id))
    )
      throw Error("Confira nome, vigência e referências.");
    const document = validatePhasePlan(input.kind, input.document);
    const { data: active, error } = await client
      .from("projects")
      .select("id")
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error || !active) throw Error("Ative um projeto para salvar planos.");
    const payload = {
      ...input,
      title: input.title.trim(),
      project_id: active.id,
      document,
    };
    const previous = await client
      .from("phase_plans")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (previous.error)
      throw Error("Não foi possível verificar a tentativa anterior.");
    if (previous.data) {
      const { isDeepStrictEqual } = await import("node:util");
      for (const [key, value] of Object.entries(payload)) {
        if (!isDeepStrictEqual(previous.data[key], value))
          throw Error(
            "Esta tentativa já foi utilizada. Reabra o plano antes de salvar uma nova versão.",
          );
      }
    } else {
      const saved = await client.from("phase_plans").insert(payload);
      if (saved.error)
        throw Error(
          "Não foi possível salvar. Confira fase, vigência e projeto ativo.",
        );
    }
    revalidatePath("/painel", "layout");
    return {
      message:
        "Versão salva. Nenhuma atividade ou consumo foi registrado automaticamente.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o plano.",
    };
  }
}
export async function applyHydrationReference(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("plan_id")),
    value = Number(String(form.get("target_ml")));
  if (
    !isId(id) ||
    !Number.isInteger(value) ||
    value < 100 ||
    value > 15000 ||
    form.get("confirm") !== "on"
  )
    return fail("Escolha e confirme uma referência em ml.");
  const plan = await client
    .from("phase_plans")
    .select("*")
    .eq("id", id)
    .eq("kind", "hydration")
    .maybeSingle();
  if (
    plan.error ||
    !plan.data ||
    plan.data.effective_from > today() ||
    (plan.data.valid_until && plan.data.valid_until < today())
  )
    return fail("Plano indisponível ou ainda não vigente.");
  const doc = validatePhasePlan(
    "hydration",
    plan.data.document,
  ) as import("@/lib/phase-plans").WaterPlan;
  const ranges = [doc, ...doc.alternatives];
  if (!ranges.some((range) => value >= range.min_ml && value <= range.max_ml))
    return fail("Escolha um valor dentro de uma das faixas cadastradas.");
  const active = await client
    .from("projects")
    .select("id")
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (active.error || !active.data || active.data.id !== plan.data.project_id)
    return fail("Este plano não pertence ao projeto ativo.");
  const result = await client
    .from("water_goals")
    .upsert(
      { project_id: active.data.id, effective_from: today(), target_ml: value },
      { onConflict: "project_id,effective_from" },
    );
  if (result.error)
    return fail(
      "Não foi possível alterar a referência. Confira a vigência do projeto.",
    );
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message:
      "Referência de água atualizada a partir de hoje. Dias anteriores foram preservados.",
  };
}
export async function recordPlannedWorkout(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = String(form.get("request_id")),
    plan = String(form.get("plan_id")),
    workout = String(form.get("workout_id")),
    date = String(form.get("logged_on")),
    existing = String(form.get("existing") ?? "");
  const duration = Number(String(form.get("duration_min"))),
    raw = String(form.get("rpe") ?? "").trim(),
    rpe = raw ? Number(raw.replace(",", ".")) : null,
    notes = String(form.get("notes") ?? "").trim() || null;
  if (
    !isId(id) ||
    !isId(plan) ||
    !isId(workout) ||
    !isDate(date) ||
    date > today() ||
    (existing && !isId(existing)) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 1440 ||
    (rpe !== null && (!Number.isFinite(rpe) || rpe < 0 || rpe > 10)) ||
    (notes && notes.length > 500)
  )
    return fail("Confira data, duração e esforço.");
  const { error } = await client.rpc("record_planned_workout", {
    p_request: id,
    p_plan: plan,
    p_workout: workout,
    p_date: date,
    p_duration: duration,
    p_rpe: rpe,
    p_existing: existing || null,
    p_notes: notes,
  });
  if (error)
    return fail(
      "Não foi possível registrar. Confira a vigência, a atividade escolhida e se ela já possui vínculo.",
    );
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message: existing
      ? "Execução vinculada à atividade existente. Nenhuma nova sessão foi criada."
      : "Execução registrada no diário de atividades.",
  };
}
export async function deletePlanImage(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client, user } = await requireAccount();
  const id = String(form.get("id")),
    admin = createAdminClient();
  if (!isId(id) || form.get("confirm") !== "on" || !admin)
    return fail("Confirme a exclusão da referência.");
  const removed = await client
    .from("plan_assets")
    .delete()
    .eq("id", id)
    .select("id");
  if (removed.error || !removed.data?.length)
    return fail(
      "A referência está vinculada a uma versão ou o projeto é somente leitura.",
    );
  try {
    await cleanPlanAssetJobs(admin, user.id, 20);
  } catch {
    /* A fila durável mantém a limpeza pendente. */
  }
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message:
      "Referência removida. A limpeza física será repetida se necessário.",
  };
}

export async function unlinkWorkout(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount(),
    id = String(form.get("id"));
  if (!isId(id) || form.get("confirm") !== "on")
    return fail("Confirme a remoção do vínculo.");
  const result = await client
    .from("workout_links")
    .delete()
    .eq("id", id)
    .select("id");
  if (result.error || !result.data?.length)
    return fail("Não foi possível remover. Confira o projeto ativo.");
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message: "Vínculo removido. A atividade foi preservada.",
  };
}
