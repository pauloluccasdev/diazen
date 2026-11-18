import "./projects.css";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  ChevronRight,
  Flag,
  FolderOpen,
  Scale,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  formatDate,
  number,
  statusLabel,
  type Project,
  type ProjectStatus,
} from "@/lib/domain";
import {
  projectCounts,
  projectTiming,
  projectWeightReference,
} from "@/lib/project-metrics";
import type { projectWeightSummary } from "@/lib/projects-data";
import { ProjectCreateFields } from "@/components/project-fields";
import { createProject } from "@/app/painel/projetos/actions";
import {
  ProjectActionForm,
  ProjectDialog,
  ProjectDialogButton,
  ProjectFeedbackProvider,
} from "./project-dialog";
import { ProjectManagement } from "./project-management";

function Timing({ project, date }: { project: Project; date: string }) {
  const timing = projectTiming(project, date);
  return (
    <div className="dz-project-timing">
      {timing.percent !== null ? (
        <>
          <progress
            max={100}
            value={timing.percent}
            aria-label={`Tempo decorrido de ${project.name}`}
          />
          <strong>{timing.percent}%</strong>
        </>
      ) : (
        <small>Sem data final definida</small>
      )}
      {timing.percent !== null && <small>Tempo de calendário</small>}
    </div>
  );
}

function ProjectCard({
  project,
  date,
  featured,
  weight,
}: {
  project: Project;
  date: string;
  featured: boolean;
  weight: Awaited<ReturnType<typeof projectWeightSummary>> | null;
}) {
  const reference = projectWeightReference(project),
    timing = projectTiming(project, date);
  const target = reference
    ? reference.max !== null
      ? `${number(reference.min)}–${number(reference.max)} kg`
      : `${number(reference.min)} kg`
    : null;
  return (
    <article
      className={`content-card project-list-card dz-project-card project-${project.status.toLowerCase()}${featured ? " is-featured" : ""}`}
    >
      <div className="dz-project-cover" aria-hidden="true">
        <Image
          unoptimized
          src={
            featured
              ? "/images/athlete-project-v2.webp"
              : "/images/strength-editorial-v2.webp"
          }
          alt=""
          width={featured ? 700 : 900}
          height={featured ? 1050 : 450}
        />
      </div>
      <div className="dz-project-content">
        <span
          className={`status dz-project-status status-${project.status.toLowerCase()}`}
        >
          <span
            className={`status-dot status-${project.status.toLowerCase()}`}
          />
          {statusLabel[project.status]}
        </span>
        <ProjectDialogButton
          target={`project-manage-${project.id}`}
          icon="more"
          ariaLabel={`Gerenciar ${project.name}`}
          className="dz-project-menu button-secondary"
        />
        <h2>
          <Link prefetch={false} href={`/painel?projeto=${project.id}`}>
            {project.name}
          </Link>
        </h2>
        <p className="dz-project-dates">
          <CalendarDays size={17} aria-hidden="true" />
          <span>
            <time dateTime={project.starts_on}>
              {formatDate(project.starts_on)}
            </time>
            {project.ends_on && (
              <>
                {" "}
                –{" "}
                <time dateTime={project.ends_on}>
                  {formatDate(project.ends_on)}
                </time>
              </>
            )}
          </span>
        </p>
        {featured && (
          <p className="dz-project-description">
            Alimentação, hidratação, treinos e evolução no mesmo acompanhamento.
          </p>
        )}
        <Timing project={project} date={date} />
      </div>
      {featured && (
        <div
          className={`dz-project-metrics${target || project.sessions_goal !== null ? " has-reference" : ""}`}
        >
          <div>
            <CalendarDays size={25} aria-hidden="true" />
            <strong>
              {timing.elapsed} {timing.elapsed === 1 ? "dia" : "dias"}
            </strong>
            <small>
              {timing.total === null ? "desde o início" : `de ${timing.total}`}
            </small>
          </div>
          <div>
            <Scale size={25} aria-hidden="true" />
            <strong>
              {weight?.latest
                ? `${number(weight.latest.kg)} kg`
                : "Sem registro"}
            </strong>
            <small>
              {weight?.latest
                ? `em ${formatDate(weight.latest.logged_on)}`
                : "peso no projeto"}
            </small>
          </div>
          {(target || project.sessions_goal !== null) && (
            <div>
              <Target size={25} aria-hidden="true" />
              <strong>
                {target ??
                  (project.sessions_goal !== null
                    ? `${project.sessions_goal} sessões`
                    : null)}
              </strong>
              <small>
                {target
                  ? reference?.max !== null
                    ? "faixa de peso"
                    : "meta de peso"
                  : project.sessions_goal !== null
                    ? "referência semanal"
                    : ""}
              </small>
            </div>
          )}
          <div>
            <TrendingUp size={25} aria-hidden="true" />
            <strong>
              {weight?.difference != null
                ? `${weight.difference > 0 ? "+" : ""}${number(weight.difference)} kg`
                : "Sem comparação"}
            </strong>
            <small>
              {weight?.difference != null && weight.first
                ? `desde ${formatDate(weight.first.logged_on)}`
                : "entre duas datas"}
            </small>
          </div>
        </div>
      )}
      <Link
        prefetch={false}
        href={`/painel?projeto=${project.id}`}
        className="dz-project-consult"
        aria-label={`Consultar projeto ${project.name}`}
      >
        <span>Consultar projeto</span>
        <ChevronRight size={22} aria-hidden="true" />
      </Link>
      <ProjectManagement project={project} />
    </article>
  );
}

export function ProjectDirectory({
  projects,
  status,
  page,
  date,
  weight,
}: {
  projects: Project[];
  status?: ProjectStatus;
  page: number;
  date: string;
  weight: Awaited<ReturnType<typeof projectWeightSummary>> | null;
}) {
  const counts = projectCounts(projects);
  const ordered = projects.toSorted(
    (a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"),
  );
  const filtered = status
    ? ordered.filter((p) => p.status === status)
    : ordered;
  const visible = filtered.slice((page - 1) * 20, page * 20);
  const featured = visible.find((p) => p.status === "ACTIVE");
  const other = visible.filter((p) => p.id !== featured?.id);
  const href = (state?: ProjectStatus, value = 1) =>
    `/painel/projetos?${new URLSearchParams({ pagina: String(value), ...(state ? { estado: state } : {}) })}`;
  const tabs = [
    [undefined, "Todos", projects.length],
    ["ACTIVE", "Ativo", counts.ACTIVE],
    ["DRAFT", "Planejados", counts.DRAFT],
    ["COMPLETED", "Concluídos", counts.COMPLETED],
    ["ARCHIVED", "Arquivados", counts.ARCHIVED],
  ] as const;
  return (
    <ProjectFeedbackProvider>
      <div className="projects-page dz-projects-page">
        <header className="dz-projects-heading">
          <div>
            <h1>Projetos</h1>
            <p>
              Gerencie seus projetos
              <span className="dz-projects-desktop-copy">
                , acompanhe seus registros e mantenha o foco.
              </span>
            </p>
          </div>
          <ProjectDialogButton
            target="new-project"
            ariaLabel="Criar novo projeto"
          >
            Novo projeto
          </ProjectDialogButton>
        </header>
        <nav className="dz-project-tabs" aria-label="Estados dos projetos">
          {tabs.map(([state, label, count]) => (
            <Link
              prefetch={false}
              key={label}
              href={href(state)}
              aria-current={status === state ? "page" : undefined}
            >
              {label}
              <span> ({count})</span>
            </Link>
          ))}
        </nav>

        <section aria-label="Seus projetos" className="dz-project-list">
          {featured && (
            <ProjectCard
              project={featured}
              date={date}
              featured
              weight={weight}
            />
          )}
          {other.length > 0 && (
            <>
              <h2 className="dz-other-projects-title">
                {featured
                  ? "Outros projetos"
                  : status
                    ? tabs.find(([state]) => state === status)?.[1]
                    : "Seus projetos"}
              </h2>
              <div className="dz-project-secondary-grid">
                {other.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    date={date}
                    featured={false}
                    weight={null}
                  />
                ))}
              </div>
            </>
          )}
          {visible.length === 0 && (
            <div className="content-card dz-project-empty">
              <FolderOpen size={38} aria-hidden="true" />
              <h2>
                {projects.length === 0
                  ? "Seu próximo projeto começa aqui"
                  : "Nenhum projeto nesta consulta"}
              </h2>
              <p>
                {projects.length === 0
                  ? "Defina um nome, um período e as referências que fazem sentido para sua rotina."
                  : "Escolha outro estado ou prepare um novo projeto. Apenas um pode ficar ativo por vez."}
              </p>
            </div>
          )}
        </section>
        <details className="dz-project-filters">
          <summary>Filtrar projetos</summary>
          <form className="filter-form" method="get" action="/painel/projetos">
            <label htmlFor="project-status">Estado dos projetos</label>
            <select
              id="project-status"
              name="estado"
              defaultValue={status ?? ""}
            >
              <option value="">Todos os estados</option>
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="button-secondary">
              Filtrar projetos
            </button>
          </form>
        </details>
        <nav
          className="panel-nav dz-project-pagination"
          aria-label="Paginação de projetos"
        >
          {page > 1 && (
            <Link prefetch={false} href={href(status, page - 1)}>
              Anteriores
            </Link>
          )}
          {filtered.length > page * 20 && (
            <Link prefetch={false} href={href(status, page + 1)}>
              Próximos projetos
            </Link>
          )}
        </nav>
        <section className="content-card dz-project-create-cta">
          <span>
            <Flag size={30} aria-hidden="true" />
          </span>
          <div>
            <h2>Defina um novo projeto</h2>
            <p>
              Estabeleça um objetivo e período para organizar seu
              acompanhamento.
            </p>
          </div>
          <ProjectDialogButton target="new-project">
            Criar projeto
          </ProjectDialogButton>
        </section>
        <p className="dz-projects-note">
          Somente um projeto ativo por vez. Consultar outro projeto preserva o
          destino dos registros. Projetos concluídos e arquivados são somente
          leitura.
        </p>
        <ProjectDialog id="new-project" title="Novo projeto">
          <ProjectActionForm
            action={createProject}
            submit="Criar projeto"
            resetOnSuccess
          >
            <p className="intro">
              Escolha um nome e uma data de início. Para ativar, configure pelo
              menos uma meta mensurável de água, peso ou sessões semanais.
            </p>
            <ProjectCreateFields today={date} />
          </ProjectActionForm>
        </ProjectDialog>
      </div>
    </ProjectFeedbackProvider>
  );
}
