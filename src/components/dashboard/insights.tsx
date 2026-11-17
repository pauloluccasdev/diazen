import Link from "next/link";
import Form from "next/form";
import {
  ArrowRight,
  Dumbbell,
  Utensils,
  Scale,
  Target,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import type { Project } from "@/lib/domain";
import { number, formatDate } from "@/lib/domain";
import type { Entry, Summary } from "@/lib/records";
import { activityModality } from "@/lib/records";
import type { DashboardDetails } from "@/lib/dashboard-data";
import type { dashboardPlan } from "@/lib/dashboard-plan";
import { ProjectTimeline } from "./project-timeline";
import { MacroDonut, TimeSeriesChart, WeekComparison } from "./insight-charts";
import { CalorieBalance } from "../calorie-balance";
import "./dashboard.css";

type Diet = Awaited<ReturnType<typeof dashboardPlan>>;
export function DashboardInsights({
  project,
  date,
  period,
  start,
  weights,
  details,
  summary,
  diet,
  showWeight,
  showCalories,
}: {
  project: Project;
  date: string;
  period: string;
  start: string;
  weights: Entry[];
  details: DashboardDetails;
  summary: Summary;
  diet: Diet;
  showWeight: boolean;
  showCalories: boolean;
}) {
  const first = details.firstWeight;
  const difference =
    summary.weight !== null && first?.kg != null
      ? Number(summary.weight) - Number(first.kg)
      : null;
  const events = details.recent.map((row) => ({
    id: row.id,
    date: row.logged_on,
    title: row.name || activityModality(row),
    detail: `${activityModality(row)} · ${number(row.duration_min!)} min${row.distance_km != null ? ` · ${number(row.distance_km)} km` : ""}`,
    href: `/painel/atividades?projeto=${project.id}&data=${row.logged_on}#atividade-${row.id}`,
    kind: "activity",
  }));
  if (summary.food_count > 0)
    events.push({
      id: "food",
      date,
      title: "Alimentação",
      detail: `${summary.food_count} alimentos${showCalories && summary.kcal !== null ? ` · ${number(summary.kcal)} kcal${summary.missing_kcal ? " (parcial)" : ""}` : " registrados"}`,
      href: `/painel/alimentacao?projeto=${project.id}&data=${date}`,
      kind: "food",
    });
  if (showWeight && summary.weight !== null && summary.weight_date)
    events.push({
      id: "weight",
      date: summary.weight_date,
      title: "Peso registrado",
      detail: `${number(summary.weight)} kg`,
      href: `/painel/peso?projeto=${project.id}&data=${summary.weight_date}`,
      kind: "weight",
    });
  events.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="dz-insights">
        {showWeight && (
          <section
            className="content-card dz-weight-panel"
            aria-labelledby="weight-trend-title"
          >
            <div className="section-heading">
              <h2 id="weight-trend-title">Evolução do peso</h2>
              <Form
                action="/painel"
                className="dz-period-form"
                key={`${project.id}-${date}-${period}`}
              >
                <input type="hidden" name="projeto" value={project.id} />
                <input type="hidden" name="data" value={date} />
                <label>
                  <span className="sr-only">Período da evolução do peso</span>
                  <select name="periodo" defaultValue={period}>
                    <option value="7">Últimos 7 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="90">Últimos 90 dias</option>
                    <option value="project">Todo o projeto</option>
                  </select>
                </label>
                <button type="submit" aria-label="Aplicar período do peso">
                  Aplicar
                </button>
              </Form>
            </div>
            <div className="dz-weight-content">
              <TimeSeriesChart rows={weights} start={start} end={date} />
              <aside className="dz-weight-context">
                <span>Peso atual</span>
                <strong>
                  {summary.weight === null
                    ? "—"
                    : `${number(summary.weight)} kg`}
                </strong>
                {difference !== null && (
                  <span className="dz-weight-change">
                    {difference > 0 ? "+" : ""}
                    {number(difference)} kg
                  </span>
                )}
                <small>Primeiro registro</small>
                <b>{first?.kg == null ? "—" : `${number(first.kg)} kg`}</b>
                {first && <small>{formatDate(first.logged_on)}</small>}
              </aside>
            </div>
          </section>
        )}
        {showCalories && (
          <section
            className="content-card dz-macros-panel"
            aria-label="Resumo alimentar do dia"
          >
            <h2>Distribuição de macronutrientes</h2>
            <MacroDonut summary={summary} />
          </section>
        )}
        <section
          className="content-card dz-recent-panel"
          aria-labelledby="recent-activity-title"
        >
          <div className="section-heading">
            <h2 id="recent-activity-title">Últimas atividades</h2>
            <Link href="/painel/historico">
              Ver tudo <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {!events.length ? (
            <p className="dz-chart-empty">
              Sua rotina começa com o primeiro registro. Seus movimentos
              aparecem aqui no seu ritmo.
            </p>
          ) : (
            <ul>
              {events.slice(0, 4).map((event) => (
                <li key={event.id}>
                  <span className={`dz-event-icon is-${event.kind}`}>
                    {event.kind === "food" ? (
                      <Utensils size={23} aria-hidden="true" />
                    ) : event.kind === "weight" ? (
                      <Scale size={23} aria-hidden="true" />
                    ) : (
                      <Dumbbell size={23} aria-hidden="true" />
                    )}
                  </span>
                  <Link href={event.href}>
                    <strong>{event.title}</strong>
                    <small>{event.detail}</small>
                  </Link>
                  <time dateTime={event.date}>
                    {event.date.slice(8)}/{event.date.slice(5, 7)}
                  </time>
                  <ArrowRight size={16} aria-hidden="true" />
                </li>
              ))}
            </ul>
          )}
        </section>
        {showCalories && (
          <section className="content-card dz-week-panel">
            <h2>Comparativo semanal</h2>
            <WeekComparison details={details} date={date} />
          </section>
        )}
        <section
          className="content-card dz-project-panel"
          aria-labelledby="project-progress-title"
        >
          <div className="section-heading">
            <h2 id="project-progress-title">Progresso do projeto</h2>
            <Link href="/painel/projetos">
              Ver detalhes <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="dz-project-identity">
            <span className="dz-event-icon">
              <Target size={28} aria-hidden="true" />
            </span>
            <div>
              <h3>{project.name}</h3>
              <p>
                {formatDate(project.starts_on)}
                {project.ends_on && ` — ${formatDate(project.ends_on)}`}
              </p>
            </div>
          </div>
          <ProjectTimeline project={project} date={date} />
          <div className="dz-project-statistics">
            <div>
              <CalendarDays size={21} aria-hidden="true" />
              <strong>
                {project.ends_on
                  ? Math.max(
                      0,
                      Math.round(
                        (Date.parse(project.ends_on + "T12:00:00Z") -
                          Date.parse(date + "T12:00:00Z")) /
                          86400000,
                      ),
                    )
                  : "—"}
              </strong>
              <span>dias restantes</span>
            </div>
            {showWeight && (
              <div>
                <Target size={21} aria-hidden="true" />
                <strong>
                  {difference === null
                    ? "—"
                    : `${difference > 0 ? "+" : ""}${number(difference)} kg`}
                </strong>
                <span>desde o primeiro peso</span>
              </div>
            )}
            <div>
              <TrendingUp size={21} aria-hidden="true" />
              <strong>
                {summary.sessions ?? "—"}
                {project.sessions_goal !== null && `/${project.sessions_goal}`}
              </strong>
              <span>sessões na semana</span>
            </div>
          </div>
        </section>
      </div>
      {diet && showCalories && (
        <details className="dashboard-diet-comparison dz-plan-disclosure">
          <summary>
            Plano e consumo do dia <ArrowRight size={18} aria-hidden="true" />
          </summary>
          <CalorieBalance
            consumed={summary.kcal}
            planned={diet.totals.kcal.value}
            partial={diet.totals.kcal.missing > 0 || summary.missing_kcal > 0}
          />
          <dl className="diet-comparison-grid">
            <div>
              <dt>Refeições planejadas</dt>
              <dd>{diet.plannedMeals}</dd>
            </div>
            <div>
              <dt>Refeições com registros</dt>
              <dd>{diet.recordedMeals}</dd>
            </div>
            <div>
              <dt>Refeições vinculadas ao plano</dt>
              <dd>{diet.registeredMeals.length}</dd>
            </div>
          </dl>
          <p className="field-hint">
            Registros contam categorias do diário. Vínculos ao plano são
            explícitos e não indicam aderência.
          </p>
          <Link
            className="button-secondary"
            href={`/painel/plano?projeto=${project.id}&data=${date}`}
          >
            Consultar plano alimentar{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </details>
      )}
    </>
  );
}
