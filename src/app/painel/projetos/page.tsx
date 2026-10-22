import Link from "next/link";
import { projectContext } from "@/lib/data";
import { formatDate, statusLabel, today } from "@/lib/domain";
import type { ProjectStatus } from "@/lib/domain";
import { ActionForm } from "@/components/forms/action-form";
import {
  createProject,
  changeProject,
  changeWaterGoal,
  changeGoals,
  changeDraftDates,
} from "./actions";
export const metadata = { title: "Projetos e metas" };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.pagina)) || 1),
  );
  const status =
    params.estado && Object.hasOwn(statusLabel, params.estado)
      ? (params.estado as ProjectStatus)
      : undefined;
  const { projects, hasMore } = await projectContext(undefined, page, status);
  const pageUrl = (value: number) =>
    `/painel/projetos?${new URLSearchParams({ pagina: String(value), ...(status ? { estado: status } : {}) })}`;
  return (
    <>
      <section className="welcome">
        <p className="eyebrow">UMA META, UM CAMINHO</p>
        <h1>Meus projetos.</h1>
        <p className="intro">
          Só um projeto fica ativo de cada vez. Consultar o histórico não altera
          o destino dos seus registros.
        </p>
      </section>
      <section className="content-card">
        <h2>
          {projects.length || status
            ? "Novo projeto"
            : "Vamos preparar seu primeiro projeto?"}
        </h2>
        <p className="intro">
          Escolha um nome, uma data de início e pelo menos uma meta mensurável.
          Água, peso e sessões são opcionais individualmente.
        </p>
        <ActionForm action={createProject} submit="Criar projeto">
          <label>
            Nome do projeto
            <input
              name="name"
              required
              maxLength={100}
              placeholder="Ex.: Minha jornada"
            />
          </label>
          <div className="form-grid">
            <label>
              Início
              <input
                type="date"
                name="starts_on"
                required
                defaultValue={today()}
              />
            </label>
            <label>
              Fim previsto (opcional)
              <input type="date" name="ends_on" />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Meta diária de água (ml)
              <input
                name="water_ml"
                type="number"
                min={100}
                max={15000}
                step={1}
              />
            </label>
            <label>
              Sessões por semana
              <input name="sessions" type="number" min={1} max={50} step={1} />
            </label>
          </div>
          <label>
            Acompanhamento de peso
            <select name="weight_mode" defaultValue="none">
              <option value="none">Sem meta de peso</option>
              <option value="track">Apenas acompanhar</option>
              <option value="target">Peso alvo</option>
              <option value="range">Faixa de peso</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Alvo ou mínimo (kg)
              <input
                name="weight_min"
                type="number"
                min={20}
                max={500}
                step="0.01"
              />
            </label>
            <label>
              Máximo da faixa (kg)
              <input
                name="weight_max"
                type="number"
                min={20}
                max={500}
                step="0.01"
              />
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" name="draft" />
            Salvar como rascunho, sem ativar
          </label>
        </ActionForm>
      </section>
      <section className="records-section" aria-label="Seus projetos">
        <form className="content-card" method="get" action="/painel/projetos">
          <label htmlFor="project-status">Estado dos projetos</label>
          <select id="project-status" name="estado" defaultValue={status ?? ""}>
            <option value="">Todos os estados</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="button-secondary" type="submit">
            Filtrar projetos
          </button>
        </form>
        {!projects.length && (
          <p className="intro">
            {status
              ? "Nenhum projeto neste estado nesta página."
              : "Nenhum projeto nesta página."}
          </p>
        )}
        {projects.map((p) => (
          <article className="content-card" key={p.id}>
            <span className="status">{statusLabel[p.status]}</span>
            <h2>{p.name}</h2>
            <p className="intro">
              {formatDate(p.starts_on)}
              {p.ends_on && ` até ${formatDate(p.ends_on)}`}
            </p>
            <Link className="back-link" href={`/painel?projeto=${p.id}`}>
              Consultar projeto →
            </Link>
            {(p.status === "DRAFT" || p.status === "ACTIVE") && (
              <>
                {p.status === "DRAFT" && (
                  <details>
                    <summary>Editar datas do rascunho</summary>
                    <p className="intro">
                      O período deve incluir as metas de água já configuradas.
                      Após ativar, as datas ficam fixas.
                    </p>
                    <ActionForm action={changeDraftDates} submit="Salvar datas">
                      <input type="hidden" name="id" value={p.id} />
                      <label>
                        Início do rascunho
                        <input
                          type="date"
                          name="starts_on"
                          required
                          defaultValue={p.starts_on}
                        />
                      </label>
                      <label>
                        Fim previsto do rascunho (opcional)
                        <input
                          type="date"
                          name="ends_on"
                          defaultValue={p.ends_on ?? ""}
                        />
                      </label>
                    </ActionForm>
                  </details>
                )}
                <details>
                  <summary>Editar nome</summary>
                  <ActionForm action={changeProject} submit="Atualizar nome">
                    <input type="hidden" name="id" value={p.id} />
                    <label>
                      Nome
                      <input
                        name="name"
                        required
                        maxLength={100}
                        defaultValue={p.name}
                      />
                    </label>
                  </ActionForm>
                </details>
                <details>
                  <summary>Editar metas de peso e atividades</summary>
                  <ActionForm action={changeGoals} submit="Salvar metas">
                    <input type="hidden" name="id" value={p.id} />
                    <label>
                      Acompanhamento de peso
                      <select name="weight_mode" defaultValue={p.weight_mode}>
                        <option value="none">Sem meta de peso</option>
                        <option value="track">Apenas acompanhar</option>
                        <option value="target">Peso alvo</option>
                        <option value="range">Faixa de peso</option>
                      </select>
                    </label>
                    <div className="form-grid">
                      <label>
                        Alvo ou mínimo (kg)
                        <input
                          type="number"
                          name="weight_min"
                          min={20}
                          max={500}
                          step="0.01"
                          defaultValue={p.weight_min ?? ""}
                        />
                      </label>
                      <label>
                        Máximo da faixa (kg)
                        <input
                          type="number"
                          name="weight_max"
                          min={20}
                          max={500}
                          step="0.01"
                          defaultValue={p.weight_max ?? ""}
                        />
                      </label>
                    </div>
                    <label>
                      Sessões por semana
                      <input
                        type="number"
                        name="sessions"
                        min={1}
                        max={50}
                        defaultValue={p.sessions_goal ?? ""}
                      />
                    </label>
                  </ActionForm>
                </details>
                <details>
                  <summary>Configurar meta de água</summary>
                  <ActionForm action={changeWaterGoal} submit="Salvar meta">
                    <input type="hidden" name="project_id" value={p.id} />
                    <label>
                      Vigente a partir de
                      <input
                        type="date"
                        name="effective_from"
                        required
                        min={p.status === "ACTIVE" ? today() : p.starts_on}
                        defaultValue={
                          p.status === "DRAFT" ? p.starts_on : today()
                        }
                      />
                    </label>
                    <label>
                      Meta (ml)
                      <input
                        name="target_ml"
                        type="number"
                        required
                        min={100}
                        max={15000}
                      />
                    </label>
                  </ActionForm>
                </details>
                <ActionForm
                  action={changeProject}
                  submit={
                    p.status === "DRAFT" ? "Ativar projeto" : "Concluir projeto"
                  }
                >
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={p.status === "DRAFT" ? "ACTIVE" : "COMPLETED"}
                  />
                  {p.status === "ACTIVE" && (
                    <label className="checkbox-label">
                      <input name="confirm" type="checkbox" required />
                      Entendo que o projeto ficará somente leitura.
                    </label>
                  )}
                </ActionForm>
                <details>
                  <summary>Arquivar projeto</summary>
                  <ActionForm
                    action={changeProject}
                    submit="Confirmar arquivamento"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value="ARCHIVED" />
                    <label className="checkbox-label">
                      <input name="confirm" type="checkbox" required />
                      Entendo que o projeto ficará somente leitura.
                    </label>
                  </ActionForm>
                </details>
              </>
            )}
          </article>
        ))}
      </section>
      <nav className="panel-nav" aria-label="Paginação de projetos">
        {page > 1 && <Link href={pageUrl(page - 1)}>Anteriores</Link>}
        {hasMore && <Link href={pageUrl(page + 1)}>Próximos projetos</Link>}
      </nav>
    </>
  );
}
