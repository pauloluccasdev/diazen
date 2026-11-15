import Link from "next/link";
import { projectContext } from "@/lib/data";
import { today, isDate, isId, formatDate } from "@/lib/domain";
import { currentPhasePlans } from "@/lib/phase-plan-data";
import type { PhasePlan, PlanAsset } from "@/lib/phase-plans";
import type { Entry } from "@/lib/records";
import { PhasePlanView } from "@/components/plans/plan-view";
import { ReturnLink } from "@/components/return-link";
import { ActionForm } from "@/components/forms/action-form";
import { deletePlanImage } from "./actions";
export const metadata = { title: "Meus planos" };
export default async function Plans({
  searchParams,
}: {
  searchParams: Promise<{
    projeto?: string;
    data?: string;
    versao?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams,
    { selected, active, client } = await projectContext(params.projeto);
  if (!selected)
    return (
      <section className="content-card">
        <h1>Meus planos</h1>
        <Link href="/painel/projetos">Criar ou ativar projeto</Link>
      </section>
    );
  const date = params.data && isDate(params.data) ? params.data : today(),
    editable = selected.id === active?.id && selected.status === "ACTIVE";
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.pagina) || 1)),
  );
  const [current, versions, assets, selection, activities, links] =
    await Promise.all([
      currentPhasePlans(client, selected.id, date),
      client
        .from("phase_plans")
        .select("id,title,kind,effective_from,created_at,phase_name")
        .eq("project_id", selected.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range((page - 1) * 20, page * 20),
      client
        .from("plan_assets")
        .select("*")
        .eq("project_id", selected.id)
        .order("created_at", { ascending: false })
        .order("id")
        .limit(50)
        .returns<PlanAsset[]>(),
      params.versao && isId(params.versao)
        ? client
            .from("phase_plans")
            .select("*")
            .eq("id", params.versao)
            .eq("project_id", selected.id)
            .maybeSingle<PhasePlan>()
        : Promise.resolve({ data: null, error: null }),
      client
        .from("activities")
        .select("*")
        .eq("project_id", selected.id)
        .eq("logged_on", date)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<Entry[]>(),
      client
        .from("workout_links")
        .select("id,activity_id,workout_id,logged_on,rpe")
        .eq("project_id", selected.id)
        .eq("logged_on", date)
        .limit(100),
    ]);
  if (
    versions.error ||
    assets.error ||
    selection.error ||
    activities.error ||
    links.error
  )
    throw Error("Não foi possível carregar seus planos.");
  const displayed = selection.data
    ? [selection.data]
    : [current.hydration, current.strength].filter((p): p is PhasePlan =>
        Boolean(p),
      );
  return (
    <div className="module-page">
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <p className="eyebrow">
          {selected.name} · {formatDate(date)}
        </p>
        <h1>Meus planos.</h1>
        <p>
          Planejamento e execução são registros separados. Salvar uma versão não
          marca refeições, água ou treinos como realizados.
        </p>
      </section>
      {!editable && <p className="readonly-note">Histórico somente leitura.</p>}
      <nav className="plan-kind-links" aria-label="Tipos de plano">
        <Link
          className="button-secondary"
          href={`/painel/plano?projeto=${selected.id}&data=${date}`}
        >
          Plano alimentar
        </Link>
        {editable && (
          <>
            <Link
              className="button-secondary"
              href="/painel/planos/novo?tipo=hydration"
            >
              Cadastrar hidratação
            </Link>
            <Link
              className="button-secondary"
              href="/painel/planos/novo?tipo=strength"
            >
              Cadastrar fichas
            </Link>
          </>
        )}
      </nav>
      {!displayed.length && (
        <p>
          Sem plano de hidratação ou musculação vigente nesta data. Você pode
          registrar atividades e água manualmente.
        </p>
      )}
      {displayed.map((plan) => (
        <PhasePlanView
          key={plan.id}
          plan={plan}
          date={date}
          editable={editable}
          min={selected.starts_on}
          max={
            selected.ends_on && selected.ends_on < today()
              ? selected.ends_on
              : today()
          }
          activities={activities.data ?? []}
          links={links.data ?? []}
        />
      ))}
      <section className="content-card">
        <h2>Histórico de versões</h2>
        {!versions.data?.length && <p>Nenhuma versão cadastrada.</p>}
        <ul className="plan-version-list">
          {versions.data?.slice(0, 20).map((v) => (
            <li key={v.id}>
              <Link
                href={`?projeto=${selected.id}&data=${date}&versao=${v.id}`}
              >
                {v.title}
              </Link>
              <span>
                {v.kind === "hydration" ? "Hidratação" : "Musculação"} · Desde{" "}
                {formatDate(v.effective_from)}
                {v.phase_name ? ` · ${v.phase_name}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <nav aria-label="Paginação das versões">
          {page > 1 && (
            <Link
              href={`?projeto=${selected.id}&data=${date}&pagina=${page - 1}`}
            >
              Anteriores
            </Link>
          )}
          {(versions.data?.length ?? 0) > 20 && (
            <Link
              href={`?projeto=${selected.id}&data=${date}&pagina=${page + 1}`}
            >
              Próximas
            </Link>
          )}
        </nav>
      </section>
      <details className="content-card">
        <summary>Referências visuais privadas (50 mais recentes)</summary>
        <p>
          Imagens de planos são separadas da galeria corporal. Uma referência
          vinculada a uma versão é preservada no histórico.
        </p>
        {!assets.data?.length && <p>Nenhuma imagem enviada.</p>}
        {assets.data?.map((asset) => (
          <div className="plan-image-row" key={asset.id}>
            <a
              href={`/api/planos/referencias/${asset.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {asset.name}
            </a>
            {editable && (
              <details>
                <summary>Excluir referência não vinculada</summary>
                <ActionForm
                  action={deletePlanImage}
                  submit="Excluir referência"
                  feedbackMode="modal"
                >
                  <input name="id" type="hidden" value={asset.id} />
                  <label className="checkbox-label">
                    <input name="confirm" type="checkbox" required />
                    Confirmo remover esta referência privada.
                  </label>
                </ActionForm>
              </details>
            )}
          </div>
        ))}
      </details>
    </div>
  );
}
