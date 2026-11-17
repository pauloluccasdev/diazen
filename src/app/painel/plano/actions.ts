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
  references: { phase_id: string | null; reference_image_id: string | null } = {
    phase_id: null,
    reference_image_id: null,
  },
) {
  const { client } = await requireAccount();
  if (!isId(project) || !isId(requestId) || !isDate(effectiveFrom))
    return { error: "Projeto inválido." };
  if (
    (references.phase_id && !isId(references.phase_id)) ||
    (references.reference_image_id && !isId(references.reference_image_id))
  )
    return { error: "Referências inválidas." };
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
    .select("id,project_id,document,effective_from,phase_id,reference_image_id")
    .eq("id", requestId)
    .maybeSingle();
  if (readError)
    return { error: "Não foi possível verificar o plano. Tente novamente." };
  if (
    existing &&
    (existing.project_id !== project ||
      existing.effective_from !== effectiveFrom ||
      existing.phase_id !== references.phase_id ||
      existing.reference_image_id !== references.reference_image_id ||
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
      ...references,
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
