"use server";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import { categories, nutrients, units } from "@/lib/records";
import type { LibraryFood } from "@/lib/food-library";
import type { FormResult } from "@/components/forms/action-form";
const result = (error = "", message = ""): FormResult => ({ error, message });
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const value = (form: FormData, key: string) => {
  const raw = text(form, key);
  return raw ? Number(raw.replace(",", ".")) : null;
};
const positive = (n: number | null) =>
  n !== null && Number.isFinite(n) && n >= 0.001 && n <= 100000;
const refresh = () => revalidatePath("/painel", "layout");
export async function saveFood(
  _: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = text(form, "food_id"),
    name = text(form, "name"),
    unit = text(form, "unit"),
    source = text(form, "source"),
    reference = value(form, "reference_amount");
  if (
    !isId(id) ||
    !name ||
    name.length > 120 ||
    !source ||
    source.length > 200 ||
    !Object.hasOwn(units, unit) ||
    !positive(reference)
  )
    return result("Confira nome, unidade, referência e fonte.");
  const data: Record<string, string | number | null> = {
    name,
    unit,
    reference_amount: reference,
    source,
  };
  for (const key of Object.keys(nutrients)) {
    const n = value(form, key);
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 100000))
      return result(
        "Confira os nutrientes; deixe em branco os valores desconhecidos.",
      );
    data[key] = n;
  }
  const response =
    form.get("editing") === "true"
      ? await client
          .from("food_library")
          .update(data)
          .eq("id", id)
          .eq("kind", "food")
          .select("id")
      : await client
          .from("food_library")
          .insert({ ...data, id, kind: "food" })
          .select("id");
  if (response.error || !response.data?.length)
    return result(
      "Não foi possível salvar o alimento. Confira os campos e se já foi salvo.",
    );
  refresh();
  return result(
    "",
    "Alimento salvo. Registros anteriores permanecem como foram informados.",
  );
}
export async function changeLibraryFood(
  _: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = text(form, "food_id"),
    operation = text(form, "operation");
  if (!isId(id) || !["favorite", "delete"].includes(operation))
    return result("Alimento inválido.");
  if (operation === "delete" && form.get("confirm") !== "on")
    return result("Confirme a exclusão da biblioteca.");
  const response =
    operation === "delete"
      ? await client.from("food_library").delete().eq("id", id).select("id")
      : await client
          .from("food_library")
          .update({ favorite: form.get("favorite") === "true" })
          .eq("id", id)
          .select("id");
  if (response.error || !response.data?.length)
    return result("Não foi possível atualizar a biblioteca.");
  refresh();
  return result(
    "",
    operation === "delete"
      ? "Item removido da biblioteca. Diário e receitas existentes preservados."
      : "Favorito atualizado.",
  );
}
export async function createRecipe(
  _: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const id = text(form, "recipe_id"),
    name = text(form, "recipe_name"),
    portions = value(form, "portions");
  const ids = form.getAll("ingredient_id").map(String),
    amounts = form
      .getAll("ingredient_amount")
      .map((v) => Number(String(v).replace(",", ".")));
  if (
    !isId(id) ||
    !name ||
    name.length > 120 ||
    !positive(portions) ||
    !ids.length ||
    ids.length > 100 ||
    ids.length !== amounts.length ||
    !ids.every(isId) ||
    !amounts.every(positive)
  )
    return result(
      "Confira nome, rendimento e as quantidades dos ingredientes.",
    );
  const { error } = await client.rpc("save_recipe", {
    p_id: id,
    p_name: name,
    p_portions: portions,
    p_ingredients: ids.map((food_id, i) => ({ food_id, amount: amounts[i] })),
  });
  if (error)
    return result(
      "Não foi possível salvar a receita. Confira os ingredientes e os limites dos valores.",
    );
  refresh();
  return result("", "Receita salva com a composição atual dos ingredientes.");
}
export async function searchFoods(query: string, page: number) {
  const { client } = await requireAccount();
  const q = query
    .trim()
    .slice(0, 120)
    .replace(/[%_\\]/g, "");
  const offset = (Math.min(10000, Math.max(1, Math.trunc(page) || 1)) - 1) * 20;
  const { data, error } = await client
    .from("food_library")
    .select("*")
    .eq("kind", "food")
    .ilike("name", `%${q}%`)
    .order("name")
    .order("id")
    .range(offset, offset + 20)
    .returns<LibraryFood[]>();
  return {
    items: error ? [] : (data ?? []).slice(0, 20),
    hasMore: !error && (data?.length ?? 0) > 20,
    error: !!error,
  };
}
export async function addLibraryFood(
  _: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const saved = text(form, "saved_id"),
    recent = text(form, "recent_id"),
    date = text(form, "logged_on"),
    category = text(form, "category"),
    amount = value(form, "amount"),
    request = text(form, "request_id");
  if (
    (!saved && !recent) ||
    (saved && recent) ||
    !isId(saved || recent) ||
    !isId(request) ||
    !isDate(date) ||
    date > today() ||
    !Object.hasOwn(categories, category) ||
    !positive(amount)
  )
    return result("Confira alimento, data, refeição e quantidade.");
  const { error } = await client.rpc("add_library_food", {
    p_saved: saved || null,
    p_recent: recent || null,
    p_date: date,
    p_category: category,
    p_amount: amount,
    p_request: request,
  });
  if (error)
    return result(
      "Não foi possível adicionar. Confira a vigência do projeto ativo e a origem.",
    );
  refresh();
  return result(
    "",
    "Alimento adicionado ao projeto ativo. Nenhum registro existente foi substituído.",
  );
}
export async function copyMeal(
  _: FormResult,
  form: FormData,
): Promise<FormResult> {
  const { client } = await requireAccount();
  const project = text(form, "source_project"),
    sourceDate = text(form, "source_date"),
    sourceCategory = text(form, "source_category"),
    targetDate = text(form, "target_date"),
    targetCategory = text(form, "target_category"),
    request = text(form, "request_id");
  if (
    !isId(project) ||
    !isId(request) ||
    !isDate(sourceDate) ||
    !isDate(targetDate) ||
    targetDate > today() ||
    !Object.hasOwn(categories, sourceCategory) ||
    !Object.hasOwn(categories, targetCategory) ||
    form.get("confirm") !== "on"
  )
    return result("Confira origem, destino e confirme a cópia.");
  const destination = text(form, "target_plan_meal");
  if (destination) {
    const [plan, rawIndex, extra] = destination.split(":");
    const index = Number(rawIndex);
    if (
      !isId(plan) ||
      !/^\d+$/.test(rawIndex ?? "") ||
      extra !== undefined ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > 29
    )
      return result("Escolha uma refeição válida do plano de destino.");
    const source = await client
      .from("meal_items")
      .select("name,amount,unit,reference_amount,source,kcal,protein,carbs,fat")
      .eq("project_id", project)
      .eq("logged_on", sourceDate)
      .eq("category", sourceCategory)
      .order("id")
      .range(0, 100);
    if (source.error || !source.data?.length || source.data.length > 100)
      return result(
        "Escolha uma refeição de origem com 1 a 100 alimentos para vincular ao plano.",
      );
    const copied = await client.rpc("register_meal", {
      p_request: request,
      p_date: targetDate,
      p_category: targetCategory,
      p_items: source.data,
      p_plan: plan,
      p_meal: index,
    });
    if (copied.error)
      return result(
        "Não foi possível copiar. Confira origem, destino e se a refeição do plano já foi registrada nesta data.",
      );
    refresh();
    return result(
      "",
      `Cópia confirmada: ${copied.data} itens em ${categories[targetCategory as keyof typeof categories]}, ${targetDate.split("-").reverse().join("/")}, vinculados à refeição do plano. Registros existentes preservados.`,
    );
  }
  const { data, error } = await client.rpc("copy_meal", {
    p_source_project: project,
    p_source_date: sourceDate,
    p_source_category: sourceCategory,
    p_target_date: targetDate,
    p_target_category: targetCategory,
    p_request: request,
    p_confirm: true,
  });
  if (error)
    return result(
      "Não foi possível copiar. Confira os registros de origem e a vigência do projeto ativo.",
    );
  refresh();
  return result(
    "",
    `Cópia confirmada: ${data} itens em ${categories[targetCategory as keyof typeof categories]}, ${targetDate.split("-").reverse().join("/")}. Registros existentes preservados.`,
  );
}
