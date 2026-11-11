"use server";
import { requireAccount } from "@/lib/data";
import { isId, isDate, today } from "@/lib/domain";
import { validatePlan } from "@/lib/diet-plan";
import { isDeepStrictEqual } from "node:util";
import { revalidatePath } from "next/cache";
export async function saveDietPlan(
  project: string,
  requestId: string,
  input: unknown,
  effectiveFrom: string = today(),
) {
  const { client } = await requireAccount();
  if (!isId(project) || !isId(requestId) || !isDate(effectiveFrom))
    return { error: "Projeto inválido." };
  let document;
  try {
    document = validatePlan(input);
    if (JSON.stringify(document).length > 500000) throw new Error();
  } catch {
    return {
      error:
        "Confira as refeições, quantidades, fontes e a seleção de uma opção por refeição.",
    };
  }
  const { data: existing, error: readError } = await client
    .from("diet_plans")
    .select("id,project_id,document,effective_from")
    .eq("id", requestId)
    .maybeSingle();
  if (readError)
    return { error: "Não foi possível verificar o plano. Tente novamente." };
  if (
    existing &&
    (existing.project_id !== project ||
      existing.effective_from !== effectiveFrom ||
      !isDeepStrictEqual(existing.document, document))
  )
    return {
      error:
        "Esta solicitação já foi utilizada. Recarregue o plano antes de tentar novamente.",
    };
  if (!existing) {
    const { error } = await client.from("diet_plans").insert({
      id: requestId,
      project_id: project,
      title: document.title,
      effective_from: effectiveFrom,
      document,
    });
    if (error)
      return {
        error:
          "Não foi possível salvar. Confira se o projeto ainda está ativo ou em rascunho.",
      };
  }
  revalidatePath("/painel", "layout");
  return {
    message:
      "Plano salvo. Os registros de consumo do diário foram preservados.",
  };
}
