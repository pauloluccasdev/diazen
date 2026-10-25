import Link from "next/link";
import { ReturnLink } from "@/components/return-link";
import { DietPlanEditor } from "@/components/diet-plan-editor";
import { projectContext } from "@/lib/data";
import { isDate, today, formatDate, isId } from "@/lib/domain";
import type { DietPlan } from "@/lib/diet-plan";
import type { Summary } from "@/lib/records";
export const metadata = { title: "Meu plano alimentar" };
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string; versao?: string }>;
}) {
  const filters = await searchParams;
  const { client, selected } = await projectContext(filters.projeto);
  if (!selected)
    return (
      <section className="welcome">
        <h1>Meu plano alimentar</h1>
        <Link className="button-primary" href="/painel/projetos">
          Criar projeto
        </Link>
      </section>
    );
  const date = filters.data && isDate(filters.data) ? filters.data : today();
  const [versions, total] = await Promise.all([
    client
      .from("diet_plans")
      .select("id,title,created_at")
      .eq("project_id", selected.id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(20),
    client.rpc("project_summary", { p_project: selected.id, p_date: date }),
  ]);
  if (versions.error || total.error)
    throw new Error("Não foi possível carregar o plano alimentar");
  const id =
    filters.versao && isId(filters.versao)
      ? filters.versao
      : versions.data?.[0]?.id;
  let initial: DietPlan | null = null;
  if (id) {
    const result = await client
      .from("diet_plans")
      .select("document")
      .eq("id", id)
      .eq("project_id", selected.id)
      .maybeSingle();
    if (result.error) throw new Error("Não foi possível carregar a versão");
    initial = result.data?.document ?? null;
  }
  const summary = total.data as Summary;
  const editable = ["ACTIVE", "DRAFT"].includes(selected.status);
  return (
    <div className="module-page">
      <section className="welcome module-welcome">
        <ReturnLink
          href={`/painel/alimentacao?projeto=${selected.id}&data=${date}`}
        >
          Voltar à alimentação
        </ReturnLink>
        <p className="eyebrow">{selected.name}</p>
        <h1>
          Meu plano alimentar<span className="accent">.</span>
        </h1>
        <p className="intro">
          {initial
            ? "Consulte seu planejamento salvo, revise as refeições e salve ajustes em uma nova versão."
            : "Importe o plano da sua nutricionista, revise a base TACO e veja as calorias das opções escolhidas."}
        </p>
      </section>
      {!editable && <p className="readonly-note">Projeto somente leitura.</p>}
      {versions.data.length > 0 && (
        <form className="filter-form plan-filter">
          <input type="hidden" name="projeto" value={selected.id} />
          <input type="hidden" name="data" value={date} />
          {versions.data.length > 0 && (
            <label>
              Versões salvas (20 mais recentes)
              <select name="versao" defaultValue={id}>
                {versions.data.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ·{" "}
                    {new Date(v.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="button-secondary">Abrir versão salva</button>
        </form>
      )}
      <DietPlanEditor
        key={`${selected.id}-${filters.versao ?? "current"}-${date}`}
        project={selected.id}
        initial={initial}
        editable={editable}
        consumed={{
          kcal: summary.kcal,
          missing: Number(summary.missing_kcal),
          date: formatDate(date),
        }}
      />
    </div>
  );
}
