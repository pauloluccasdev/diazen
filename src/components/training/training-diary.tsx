import "./training.css";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Bike,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  History,
  PencilLine,
  Plus,
  Target,
  Trash2,
  Settings2,
  Waves,
} from "lucide-react";
import { ModuleContext } from "@/components/shell/module-context";
import { ModuleHeading } from "@/components/shell/module-heading";
import { DisclosureLink } from "@/components/disclosure-link";
import { HistoryLink } from "@/components/history-link";
import { ActivityWeekSummary } from "@/components/activity-week-summary";
import { ActionForm } from "@/components/forms/action-form";
import { RecordFields } from "@/components/forms/record-fields";
import { saveRecord } from "@/app/painel/[modulo]/actions";
import { type Project, formatDate, number, today } from "@/lib/domain";
import { activityModality, modalities, type Entry } from "@/lib/records";
import { trainingDuration, type TrainingMetrics } from "@/lib/training-metrics";

const icons = {
  strength: Dumbbell,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  other: Activity,
};
const colors = {
  strength: "var(--v2-primary)",
  running: "var(--v2-data)",
  cycling: "var(--training-cycle)",
  swimming: "var(--training-swim)",
  other: "var(--training-other)",
};
function shortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(date + "T12:00:00Z"))
    .replaceAll(".", "")
    .replaceAll(" de ", " ");
}
function Delta({
  value,
  previous,
  comparable = true,
}: {
  value: number | null;
  previous: number | null;
  comparable?: boolean;
}) {
  if (!comparable || value === null || previous === null || previous <= 0)
    return null;
  const delta = ((value - previous) / previous) * 100;
  return (
    <span
      className="training-delta"
      title="Variação de quantidade no mesmo intervalo da semana anterior; não representa qualidade do treino."
    >
      {delta > 0 ? "+" : ""}
      {number(delta, 0)}%
    </span>
  );
}

export function TrainingDiary({
  projects,
  selected,
  active,
  date,
  metrics,
  recent,
  rows,
  page,
  hasMore,
  registrar,
  preset,
  renderRecord,
  connection,
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  metrics: TrainingMetrics;
  recent: Entry[];
  rows: Entry[];
  page: number;
  hasMore: boolean;
  registrar?: string;
  preset?: Entry["modality"];
  renderRecord: (row: Entry) => ReactNode;
  connection?: ReactNode;
}) {
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const base = `/painel/atividades?${new URLSearchParams({ projeto: selected.id, data: date })}`;
  const max =
    selected.ends_on && selected.ends_on < today() ? selected.ends_on : today();
  const week = metrics.current;
  const previous = metrics.previous;
  const weekCounts = Object.fromEntries(
    metrics.days.map((day) => [day.date, day.count]),
  );
  const maximum = Math.max(1, ...metrics.days.map((day) => day.count));
  const goal = selected.sessions_goal;
  const progress =
    goal !== null && goal > 0 ? Math.min(100, (week.count / goal) * 100) : null;
  const day = metrics.daily;
  const register = (
    <DisclosureLink
      targetId="novo-registro"
      href={`${base}&registrar=1#novo-registro`}
      className="button-primary"
    >
      <Plus size={23} aria-hidden="true" />
      Registrar treino
    </DisclosureLink>
  );
  return (
    <div className="module-page module-atividades training-diary">
      <ModuleContext
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path="/painel/atividades"
      />
      <ModuleHeading
        key={`${selected.id}-${date}`}
        title="Treinos"
        description="Registre suas atividades e acompanhe sua evolução."
        project={{ id: selected.id, name: selected.name }}
        date={date}
        path="/painel/atividades"
        action={editable ? register : undefined}
      />
      {!editable && (
        <p className="readonly-note">
          {selected.status === "DRAFT"
            ? "Rascunhos não recebem registros."
            : "Histórico somente leitura."}
          {active && (
            <>
              {" "}
              <Link
                prefetch={false}
                href={`/painel/atividades?projeto=${active.id}`}
              >
                Registrar no projeto ativo “{active.name}” →
              </Link>
            </>
          )}
        </p>
      )}
      <section
        className="content-card training-day-hero"
        aria-label="Treinos do dia consultado"
      >
        <div className="training-day-circle">
          <Dumbbell size={26} aria-hidden="true" />
          <strong>
            {day.count} {day.count === 1 ? "treino" : "treinos"}
          </strong>
          <span>do dia</span>
        </div>
        <dl>
          <div>
            <dt>
              <Clock3 size={21} aria-hidden="true" />
              Duração total
            </dt>
            <dd>{trainingDuration(day.duration)}</dd>
          </div>
          <div>
            <dt>
              <Flame size={21} aria-hidden="true" />
              Calorias informadas
            </dt>
            <dd>
              {day.calories === null
                ? "Não informadas"
                : `${number(day.calories)} kcal`}
              {day.missingCalories > 0 && day.calories !== null && (
                <small>Subtotal parcial</small>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <ChartNoAxesColumn size={21} aria-hidden="true" />
              Volume (musculação)
            </dt>
            <dd
              className="training-no-volume"
              title="O registro atual não inclui séries, repetições e cargas realizadas."
            >
              Indisponível
            </dd>
          </div>
        </dl>
      </section>
      <section
        className="training-stat-grid"
        aria-label="Indicadores da semana"
      >
        {[
          {
            label: "Treinos na semana",
            value: String(week.count),
            icon: Dumbbell,
            current: week.count,
            previous: previous.count,
            comparable: true,
          },
          {
            label: "Tempo total",
            value: trainingDuration(week.duration),
            icon: Clock3,
            current: week.duration,
            previous: previous.duration,
            comparable: true,
          },
          {
            label: "Calorias informadas",
            value:
              week.calories === null
                ? "Não informadas"
                : `${number(week.calories)} kcal`,
            icon: Flame,
            current: week.calories,
            previous: previous.calories,
            comparable:
              week.missingCalories === 0 && previous.missingCalories === 0,
            partial: week.calories !== null && week.missingCalories > 0,
          },
          {
            label: "Distância (corrida + bike)",
            value:
              week.distance === null
                ? "Não informada"
                : `${number(week.distance, 2)} km`,
            icon: Footprints,
            current: week.distance,
            previous: previous.distance,
            comparable:
              week.missingDistance === 0 && previous.missingDistance === 0,
            partial: week.distance !== null && week.missingDistance > 0,
          },
        ].map(
          ({
            label,
            value,
            icon: Icon,
            current,
            previous: prior,
            comparable,
            partial,
          }) => (
            <div className="content-card training-stat" key={label}>
              <span className="training-stat-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
                {partial && <small>Subtotal parcial</small>}
              </div>
              <Delta value={current} previous={prior} comparable={comparable} />
            </div>
          ),
        )}
      </section>
      <div className="training-overview-grid">
        <section className="content-card training-frequency">
          <h2>Frequência de treinos</h2>
          <div
            className="training-frequency-chart"
            role="list"
            aria-label="Registros por dia da semana"
          >
            {metrics.days.map((day) => {
              const content = (
                <>
                  <span className="training-frequency-value">
                    {day.future ? "—" : day.count}
                  </span>
                  <span className="training-frequency-track">
                    <span
                      style={{ height: `${(day.count / maximum) * 100}%` }}
                    />
                  </span>
                  <span className="training-frequency-date">
                    {shortDate(day.date)}
                  </span>
                </>
              );
              return day.future ? (
                <span
                  role="listitem"
                  className="training-frequency-day is-future"
                  key={day.date}
                  aria-label={`${formatDate(day.date)} · Dia futuro`}
                >
                  {content}
                </span>
              ) : (
                <span role="listitem" key={day.date}>
                  <HistoryLink
                    className="training-frequency-day"
                    href={`/painel/atividades?projeto=${selected.id}&data=${day.date}#registros-do-dia`}
                    aria-current={day.date === date ? "date" : undefined}
                    aria-label={`${formatDate(day.date)} · ${day.count} atividades registradas`}
                  >
                    {content}
                  </HistoryLink>
                </span>
              );
            })}
          </div>
          <p className="sr-only">
            Quantidade de registros. Descanso e adaptação fazem parte do
            planejamento.
          </p>
        </section>
        <section className="content-card training-distribution">
          <h2>Distribuição por atividade</h2>
          <div>
            <div className="training-donut">
              <svg
                viewBox="0 0 120 120"
                role="img"
                aria-label={`Distribuição dos ${week.count} treinos registrados na semana`}
              >
                <circle
                  className="ring-track"
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  strokeWidth="14"
                />
                {metrics.distribution.map((item, index) => {
                  const percent = week.count
                    ? (item.count / week.count) * 100
                    : 0;
                  const start =
                    (metrics.distribution
                      .slice(0, index)
                      .reduce((sum, prior) => sum + prior.count, 0) /
                      (week.count || 1)) *
                    100;
                  return (
                    <circle
                      key={item.key}
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke={colors[item.key]}
                      strokeWidth="14"
                      pathLength="100"
                      strokeDasharray={`${percent} ${100 - percent}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 60 60)"
                      visibility={percent > 0 ? "visible" : "hidden"}
                    />
                  );
                })}
              </svg>
              <span>
                <strong>{week.count}</strong>
                <small>Treinos</small>
              </span>
            </div>
            <ul>
              {metrics.distribution.map((item) => (
                <li key={item.key}>
                  <span
                    className="training-dot"
                    style={{ background: colors[item.key] }}
                  />
                  <span>{item.label}</span>
                  <strong>
                    {week.count
                      ? `${number((item.count / week.count) * 100, 1)}%`
                      : "—"}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="content-card training-goal">
          <h2>
            <Target size={20} aria-hidden="true" />
            Meta semanal
            {editable && (
              <Link
                prefetch={false}
                href="/painel/projetos"
                aria-label="Configurar meta de frequência"
              >
                <Settings2 size={17} aria-hidden="true" />
              </Link>
            )}
          </h2>
          {goal === null ? (
            <p>Meta semanal não configurada.</p>
          ) : (
            <>
              <strong>
                {week.count} de {goal} treinos
              </strong>
              <progress
                max={goal}
                value={Math.min(week.count, goal)}
                aria-label="Treinos registrados em relação à referência semanal"
              />
              <span>{number(progress!, 0)}%</span>
              <p>
                Referência atual do projeto. Ajuste sua rotina quando
                necessário.
              </p>
            </>
          )}
        </section>
      </div>
      <div className="training-lower-grid">
        {editable && (
          <section className="training-modalities">
            <h2>Registrar treino</h2>
            <nav aria-label="Registrar por modalidade">
              {Object.entries(modalities).map(([key, label]) => {
                const Icon = icons[key as keyof typeof icons];
                return (
                  <DisclosureLink
                    key={key}
                    modality={key as keyof typeof modalities}
                    targetId="novo-registro"
                    href={`${base}&registrar=1&modalidade=${key}#novo-registro`}
                    className={`training-modality training-modality-${key}`}
                  >
                    <Icon size={27} aria-hidden="true" />
                    <span>{key === "other" ? "Outros" : label}</span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </DisclosureLink>
                );
              })}
            </nav>
          </section>
        )}
        <section className="training-recent">
          <header>
            <h2>Treinos recentes</h2>
            <HistoryLink href={`/painel/historico?data=${date}`}>
              Ver histórico <ChevronRight size={18} aria-hidden="true" />
            </HistoryLink>
          </header>
          <ul>
            {recent.map((row) => {
              const Icon = icons[row.modality ?? "other"];
              const onPage = rows.some((item) => item.id === row.id);
              const detailHref = `/painel/atividades?projeto=${selected.id}&data=${row.logged_on}&atividade=${row.id}#atividade-${row.id}`;
              return (
                <li
                  key={row.id}
                  className={`training-recent-${row.modality ?? "other"}`}
                >
                  <DisclosureLink
                    className="training-recent-main"
                    href={detailHref}
                    targetId={`activity-details-${row.id}`}
                    navigate={!onPage}
                  >
                    <span className="training-recent-icon">
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    <span className="training-recent-name">
                      <strong>{row.name || activityModality(row)}</strong>
                      <small>
                        {activityModality(row)} · {shortDate(row.logged_on)}
                      </small>
                    </span>
                    <span className="training-recent-values">
                      <span>
                        <Clock3 size={17} aria-hidden="true" />
                        {trainingDuration(Number(row.duration_min))}
                      </span>
                      <span>
                        <Flame size={17} aria-hidden="true" />
                        {row.kcal == null
                          ? "Não informadas"
                          : `${number(row.kcal)} kcal`}
                      </span>
                    </span>
                    <ChevronRight
                      className="training-recent-chevron"
                      size={20}
                      aria-hidden="true"
                    />
                  </DisclosureLink>
                  {editable && (
                    <div className="training-recent-actions">
                      <DisclosureLink
                        ariaLabel={`Editar treino ${row.name || activityModality(row)}`}
                        href={detailHref.replace("#", "&acao=editar#")}
                        targetId={`edit-activity-${row.id}`}
                        navigate={!onPage}
                      >
                        <PencilLine size={19} aria-hidden="true" />
                      </DisclosureLink>
                      <DisclosureLink
                        ariaLabel={`Excluir treino ${row.name || activityModality(row)}`}
                        href={detailHref.replace("#", "&acao=excluir#")}
                        targetId={`delete-activity-${row.id}`}
                        navigate={!onPage}
                      >
                        <Trash2 size={19} aria-hidden="true" />
                      </DisclosureLink>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {!recent.length && (
            <p className="content-card empty-state">
              Nenhum treino registrado até esta data.
            </p>
          )}
        </section>
        <section className="content-card training-week-breakdown">
          <h2>
            <CalendarDays size={21} aria-hidden="true" />
            Resumo da semana
          </h2>
          <ul>
            {metrics.distribution.map((item) => {
              const Icon = icons[item.key];
              return (
                <li key={item.key}>
                  <span
                    className={`training-small-icon training-icon-${item.key}`}
                  >
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <strong>{item.label}</strong>
                  <span>
                    {item.count} {item.count === 1 ? "treino" : "treinos"}
                    {item.count > 0 && (
                      <> · {trainingDuration(item.duration)}</>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {editable && <div className="training-mobile-register">{register}</div>}
      {editable && (
        <details
          id="novo-registro"
          key={`${date}-${preset ?? "strength"}`}
          open={registrar === "1"}
          className="content-card record-create training-create"
        >
          <summary>Registrar atividade</summary>
          <p className="intro">
            Este registro será salvo no projeto ativo “{active?.name}”.
          </p>
          <ActionForm
            action={saveRecord}
            submit="Salvar registro"
            resetOnSuccess
            feedbackMode="modal"
          >
            <RecordFields
              kind="atividades"
              min={selected.starts_on}
              max={max}
              date={date}
              initialModality={preset}
            />
          </ActionForm>
        </details>
      )}
      <div className="training-day-navigation">
        <ActivityWeekSummary
          date={date}
          start={metrics.week.start}
          counts={weekCounts}
          total={week.count || null}
          goal={goal}
          today={today()}
          historyProject={selected.id === active?.id ? undefined : selected.id}
        />
      </div>
      <section
        id="registros-do-dia"
        className="records-section training-records"
        aria-label="Histórico de registros"
      >
        <header>
          <h2>Registros do dia</h2>
          <span>{formatDate(date)}</span>
        </header>
        {rows.map(renderRecord)}
        {!rows.length && (
          <p>
            Nenhum registro em {formatDate(date)}. Consulte outros dias no
            histórico.
          </p>
        )}
        <nav className="pager" aria-label="Paginação">
          {page > 1 && (
            <Link prefetch={false} href={`${base}&pagina=${page - 1}`}>
              Anteriores
            </Link>
          )}
          {hasMore && (
            <Link prefetch={false} href={`${base}&pagina=${page + 1}`}>
              Próximos
            </Link>
          )}
        </nav>
      </section>
      {connection && <div className="training-connection">{connection}</div>}
      <Link
        prefetch={false}
        className="button-secondary training-plans-link"
        href={`/painel/planos?projeto=${selected.id}`}
      >
        <Dumbbell size={21} aria-hidden="true" />
        Consultar planejamento e anexos
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      <HistoryLink
        className="button-secondary training-history-link"
        href={`/painel/historico?data=${date}`}
      >
        <History size={20} aria-hidden="true" />
        Consultar histórico geral
      </HistoryLink>
    </div>
  );
}
