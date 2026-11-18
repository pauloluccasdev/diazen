"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isId } from "@/lib/domain";
import type { FormResult } from "@/components/forms/action-form";

export async function saveWaterContainer(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client, user } = await requireAccount();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const volume = Number(form.get("volume_ml"));
  if (
    (id && !isId(id)) ||
    name.length < 1 ||
    name.length > 60 ||
    !Number.isInteger(volume) ||
    volume < 1 ||
    volume > 5000
  )
    return {
      error: "Informe nome de até 60 caracteres e volume entre 1 e 5000 ml.",
      message: "",
    };
  const values = { name, volume_ml: volume };
  const result = id
    ? await client
        .from("water_containers")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
    : await client.from("water_containers").insert(values).select("id");
  if (result.error || !result.data?.length)
    return {
      error:
        "Não foi possível salvar o recipiente. O limite é de 50 por conta.",
      message: "",
    };
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message: "Recipiente salvo. Consumos anteriores permanecem preservados.",
  };
}

export async function deleteWaterContainer(
  _state: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client, user } = await requireAccount();
  const id = String(form.get("id") ?? "");
  if (!isId(id) || form.get("confirm") !== "on")
    return { error: "Confirme a exclusão do recipiente.", message: "" };
  const { data, error } = await client
    .from("water_containers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length)
    return { error: "Não foi possível excluir o recipiente.", message: "" };
  revalidatePath("/painel", "layout");
  return {
    error: "",
    message: "Recipiente excluído. Os consumos registrados foram preservados.",
  };
}
