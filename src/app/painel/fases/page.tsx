import { ActionForm } from "@/components/forms/action-form";
import { deleteDailyRecord } from "@/app/painel/acompanhamento/actions";
import Link from "next/link";
import { ReturnLink } from "@/components/return-link";
import { PhaseForm } from "@/components/daily/phase-form";
import { projectContext } from "@/lib/data";
import { formatDate } from "@/lib/domain";
import type { ProjectPhase } from "@/lib/daily-followup";
export const metadata = { title: "Fases do projeto" };
export default async function Phases({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; pagina?: string }>;
}) {
  const params = await searchParams,
    { selected, active, client } = await projectContext(params.projeto);
  if (!selected)
    return (
      <section className="content-card">
        <h1>Fases do projeto</h1>
        <Link href="/painel/projetos">Criar ou ativar projeto</Link>
      </section>
    );
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.pagina) || 1)),
  );
  const result = await client
    .from("project_phases")
    .select("*")
    .eq("project_id", selected.id)
    .order("starts_on", { ascending: false })
    .range((page - 1) * 20, page * 20)
    .returns<ProjectPhase[]>();
  if (result.error) throw Error("Não foi possível carregar as fases.");
  const phases = result.data ?? [],
    editable = selected.id === active?.id && selected.status === "ACTIVE";
  return (
    <div className="module-page">
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <p className="eyebrow">{selected.name}</p>
        <h1>Fases do projeto.</h1>
        <p>Um período de cada vez, com objetivos que você escolhe.</p>
      </section>
      {!editable && (
        <p className="readonly-note">
          Histórico somente leitura. A criação de fases requer um projeto ativo.
        </p>
      )}
      {editable && (
        <details className="content-card">
          <summary>Adicionar fase</summary>
          <PhaseForm min={selected.starts_on} max={selected.ends_on} />
        </details>
      )}
      {!phases.length && (
        <p>Nenhuma fase cadastrada. Seus registros continuam disponíveis.</p>
      )}
      {phases.slice(0, 20).map((phase) => (
        <section className="content-card" key={phase.id}>
          <p className="eyebrow">
            {formatDate(phase.starts_on)} — {formatDate(phase.ends_on)}
          </p>
          <h2>{phase.name}</h2>
          <p>{phase.objective}</p>
          {phase.milestone && (
            <p>
              Marco: {phase.milestone} · {formatDate(phase.milestone_on!)}
            </p>
          )}
          {editable && (
            <details>
              <summary>Editar fase</summary>
              <PhaseForm
                initial={phase}
                min={selected.starts_on}
                max={selected.ends_on}
              />
            </details>
          )}
          {editable && (
            <details>
              <summary>Excluir fase</summary>
              <p>
                A exclusão remove apenas a organização desta fase; o projeto,
                planos e registros são preservados.
              </p>
              <ActionForm
                action={deleteDailyRecord}
                submit="Excluir fase"
                feedbackMode="modal"
              >
                <input type="hidden" name="id" value={phase.id} />
                <input type="hidden" name="kind" value="project_phases" />
                <label className="checkbox-label">
                  <input name="confirm" type="checkbox" required />
                  Confirmo excluir esta fase.
                </label>
              </ActionForm>
            </details>
          )}
        </section>
      ))}
      <nav aria-label="Paginação das fases">
        {page > 1 && (
          <Link href={`?projeto=${selected.id}&pagina=${page - 1}`}>
            Anteriores
          </Link>
        )}
        {phases.length > 20 && (
          <Link href={`?projeto=${selected.id}&pagina=${page + 1}`}>
            Próximas
          </Link>
        )}
      </nav>
    </div>
  );
}
