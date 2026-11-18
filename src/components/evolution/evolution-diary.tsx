import "./evolution.css";
import Link from "next/link";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Camera,
  Plus,
  PencilLine,
  Ruler,
  Target,
  Trash2,
} from "lucide-react";
import { ModuleContext } from "@/components/shell/module-context";
import { ModuleHeading } from "@/components/shell/module-heading";
import { DisclosureLink } from "@/components/disclosure-link";
import { ActionDisclosure } from "@/components/action-disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { RecordFields } from "@/components/forms/record-fields";
import { TimeSeriesChart } from "@/components/dashboard/insight-charts";
import { saveRecord, deleteRecord } from "@/app/painel/[modulo]/actions";
import { formatDate, number, today, type Project } from "@/lib/domain";
import { measurements, type Entry } from "@/lib/records";
import type {
  EvolutionMetrics,
  EvolutionPeriod,
} from "@/lib/evolution-metrics";
const periodLabels = {
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  project: "Todo o projeto",
};
function signed(value: number, digits = 1) {
  return `${value > 0 ? "+" : ""}${number(value, digits)}`;
}

function BodyScaleIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 3v4a4 4 0 0 0 8 0V3M12 5v3" />
    </svg>
  );
}

export function EvolutionDiary({
  kind,
  projects,
  selected,
  active,
  date,
  period,
  metrics,
  page,
  registrar,
}: {
  kind: "peso" | "medidas";
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  period: EvolutionPeriod;
  metrics: EvolutionMetrics;
  page: number;
  registrar?: string;
}) {
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const path = `/painel/${kind}`;
  const base = `${path}?projeto=${selected.id}&data=${date}&periodo=${period}`;
  const max =
    selected.ends_on && selected.ends_on < today() ? selected.ends_on : today();
  const formDate =
    date > max ? max : date < selected.starts_on ? selected.starts_on : date;
  const entries = metrics.entries.slice((page - 1) * 20, page * 20);
  const register = (
    <DisclosureLink
      href={`${base}&registrar=1#novo-registro`}
      targetId="novo-registro"
      className="button-primary"
    >
      <Plus size={21} aria-hidden="true" />
      {kind === "peso" ? "Registrar peso" : "Registrar medidas"}
    </DisclosureLink>
  );
  const reference = metrics.reference;
  const referenceValue = reference
    ? reference.min === reference.max
      ? `${number(reference.min)} kg`
      : `${number(reference.min)}–${number(reference.max)} kg`
    : null;
  const latestMeasurements = metrics.measurements.filter((m) => m.latest);

  function periodControl(location: "toolbar" | "chart") {
    return (
      <details key={`${location}-${period}`} className="body-period">
        <summary>
          <CalendarDays size={17} aria-hidden="true" />
          {periodLabels[period]}
          <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <nav
          aria-label={
            location === "chart"
              ? "Período do gráfico de peso"
              : "Período da evolução"
          }
        >
          {Object.entries(periodLabels).map(([key, label]) => (
            <Link
              prefetch={false}
              key={key}
              href={`${path}?projeto=${selected.id}&data=${date}&periodo=${key}`}
              aria-current={period === key ? "true" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </details>
    );
  }
  function record(row: Entry) {
    const index = metrics.allEntries.findIndex((item) => item.id === row.id);
    const previous =
      kind === "peso"
        ? metrics.allEntries.slice(index + 1).find((item) => item.kg != null)
        : metrics.allEntries
            .slice(index + 1)
            .find((item) => item.measurement_type === row.measurement_type);
    const difference = previous
      ? Number(kind === "peso" ? row.kg : row.value_cm) -
        Number(kind === "peso" ? previous.kg : previous.value_cm)
      : null;
    const title =
      kind === "peso"
        ? `${number(row.kg!, 2)} kg`
        : `${measurements[row.measurement_type!]} · ${number(row.value_cm!, 2)} cm`;
    return (
      <article
        key={row.id}
        className="body-history-row"
        id={`body-record-${row.id}`}
      >
        <header>
          <time dateTime={row.logged_on}>{formatDate(row.logged_on)}</time>
          <h3>{title}</h3>
          <span
            className="body-record-difference"
            title={
              previous
                ? `Comparação com ${formatDate(previous.logged_on)}`
                : undefined
            }
          >
            {difference === null
              ? "Sem comparação"
              : `${signed(difference, 2)} ${kind === "peso" ? "kg" : "cm"}`}
          </span>
          {editable && (
            <nav
              aria-label={`Gerenciar ${title} de ${formatDate(row.logged_on)}`}
            >
              <DisclosureLink
                href={`${base}#body-record-${row.id}`}
                targetId={`body-edit-${row.id}`}
                ariaLabel={`Editar ${title} de ${formatDate(row.logged_on)}`}
              >
                <PencilLine size={18} aria-hidden="true" />
              </DisclosureLink>
              <DisclosureLink
                href={`${base}#body-record-${row.id}`}
                targetId={`body-delete-${row.id}`}
                ariaLabel={`Excluir ${title} de ${formatDate(row.logged_on)}`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </DisclosureLink>
            </nav>
          )}
        </header>
        {editable && (
          <details className="body-record-details">
            <summary>Gerenciar registro de {formatDate(row.logged_on)}</summary>
            <ActionDisclosure
              id={`body-edit-${row.id}`}
              title="Editar registro"
              icon={PencilLine}
              className="record-action"
            >
              {kind === "peso" && (
                <p className="field-hint">
                  Atualize o peso desta data. Para outra data, adicione um novo
                  registro.
                </p>
              )}
              <ActionForm action={saveRecord} submit="Salvar alteração">
                <RecordFields
                  kind={kind}
                  entry={row}
                  min={selected.starts_on}
                  max={max}
                  dateReadOnly={kind === "peso"}
                />
              </ActionForm>
            </ActionDisclosure>
            <ActionDisclosure
              id={`body-delete-${row.id}`}
              title="Excluir registro"
              icon={Trash2}
              className="record-action destructive-action"
            >
              <ActionForm action={deleteRecord} submit="Confirmar exclusão">
                <input type="hidden" name="module" value={kind} />
                <input type="hidden" name="id" value={row.id} />
                <label className="checkbox-label">
                  <input name="confirm" type="checkbox" required />
                  Confirmo a exclusão deste registro.
                </label>
              </ActionForm>
            </ActionDisclosure>
          </details>
        )}
      </article>
    );
  }
  return (
    <div className={`module-page body-diary body-${kind}`}>
      <ModuleContext
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path={path}
      />
      <ModuleHeading
        title="Evolução corporal"
        description="Acompanhe seus registros e suas mudanças ao longo do tempo."
        project={selected}
        date={date}
        path={path}
        period={period}
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
              <Link href={`${path}?projeto=${active.id}`} prefetch={false}>
                Registrar no projeto ativo “{active.name}” →
              </Link>
            </>
          )}
        </p>
      )}
      <div className="body-toolbar">
        <nav className="evolution-tabs" aria-label="Evolução corporal">
          <Link
            prefetch={false}
            aria-current={kind === "peso" ? "page" : undefined}
            href={`/painel/peso?projeto=${selected.id}&data=${date}&periodo=${period}`}
          >
            Peso
          </Link>
          <Link
            prefetch={false}
            aria-current={kind === "medidas" ? "page" : undefined}
            href={`/painel/medidas?projeto=${selected.id}&data=${date}&periodo=${period}`}
          >
            Medidas
          </Link>
          <Link prefetch={false} href={`/painel/fotos?projeto=${selected.id}`}>
            Fotos
          </Link>
        </nav>
        {periodControl("toolbar")}
      </div>
      {kind === "peso" ? (
        <div className="body-weight-grid">
          <section
            className="content-card body-current"
            aria-label="Peso atual na consulta"
          >
            <BodyScaleIcon />
            <div>
              <span>Peso atual</span>
              <strong>
                {metrics.latest
                  ? `${number(metrics.latest.kg!, 2)} kg`
                  : "Não registrado"}
              </strong>
              {metrics.difference !== null && (
                <p className="body-difference">
                  {signed(metrics.difference, 2)} kg (
                  {signed(metrics.percentage!, 1)}%){" "}
                  <small>vs. {formatDate(metrics.previous!.logged_on)}</small>
                </p>
              )}
              <small>
                {metrics.latest
                  ? `Registrado em ${formatDate(metrics.latest.logged_on)}`
                  : "Adicione sua primeira medição."}
              </small>
            </div>
          </section>
          {reference && (
            <>
              <section className="content-card body-reference">
                <Target size={25} aria-hidden="true" />
                <div>
                  <span>
                    {reference.mode === "range"
                      ? "Faixa de referência"
                      : "Meta configurada"}
                  </span>
                  <strong>{referenceValue}</strong>
                </div>
              </section>
              <section className="content-card body-gap">
                <ChartNoAxesCombined size={25} aria-hidden="true" />
                <div>
                  <span>
                    Diferença{" "}
                    {reference.mode === "range" ? "da faixa" : "da meta"}
                  </span>
                  <strong>
                    {reference.difference === null
                      ? "—"
                      : `${signed(reference.difference, 2)} kg`}
                  </strong>
                  {reference.difference === 0 && (
                    <small>Dentro da referência configurada</small>
                  )}
                </div>
              </section>
            </>
          )}
          <section className="content-card body-weight-chart">
            <header>
              <h2>Evolução do peso</h2>
              {periodControl("chart")}
            </header>
            <div className="body-chart-wide">
              {" "}
              <TimeSeriesChart
                rows={metrics.weights}
                start={metrics.window.start}
                end={metrics.window.end}
              />
            </div>
            <div className="body-chart-compact">
              <TimeSeriesChart
                compact
                rows={metrics.weights}
                start={metrics.window.start}
                end={metrics.window.end}
              />
            </div>
            <p className="field-hint body-chart-interval">
              {formatDate(metrics.window.start)} a{" "}
              {formatDate(metrics.window.end)} · apenas medições registradas
            </p>
          </section>
          <section className="content-card body-composition">
            <h2>
              Composição <small>(referência)</small>
            </h2>
            <div className="body-empty-ring" aria-hidden="true">
              —
            </div>
            <strong>Sem avaliação registrada</strong>
            <p>
              Não estimamos gordura corporal ou massa magra a partir de peso ou
              fotografias.
            </p>
            <Link
              prefetch={false}
              href={`/painel/medidas?projeto=${selected.id}&data=${date}`}
            >
              Consultar medidas <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </div>
      ) : (
        <>
          <section
            className="body-measurement-summary"
            aria-label="Últimas medidas até a data consultada"
          >
            {latestMeasurements.length ? (
              latestMeasurements.map((item) => (
                <div
                  className="content-card body-measurement-card"
                  key={item.key}
                >
                  <Ruler size={24} aria-hidden="true" />
                  <div>
                    <h2>{item.label}</h2>
                    <strong>{number(item.latest!.value_cm!, 2)} cm</strong>
                    <small>{formatDate(item.latest!.logged_on)}</small>
                    {item.difference !== null && (
                      <p className="body-difference">
                        {signed(item.difference, 2)} cm{" "}
                        <small>
                          vs. {formatDate(item.previous!.logged_on)}
                        </small>
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="content-card empty-state">
                <Ruler size={30} aria-hidden="true" />
                <h2>Suas medidas ao longo do tempo</h2>
                <p>
                  Registre as medidas que deseja acompanhar. Campos sem
                  informação permanecem em branco.
                </p>
              </div>
            )}
          </section>
          <p className="field-hint">
            Último registro de cada tipo até {formatDate(date)}. Variações
            comparam datas reais, sem classificar mudanças como boas ou ruins.
          </p>
        </>
      )}
      {editable && <div className="body-mobile-register">{register}</div>}
      <div className="body-bottom-grid">
        <section
          className="content-card body-history"
          aria-label="Histórico de registros"
        >
          <header>
            <h2>Últimos registros</h2>
            <Link href={`/painel/historico?data=${date}`} prefetch={false}>
              Ver histórico <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </header>
          <p className="sr-only">
            Registros de {formatDate(metrics.window.start)} até{" "}
            {formatDate(metrics.window.end)}. A diferença usa o registro
            anterior disponível no período.
          </p>
          {entries.length ? (
            <>
              <div className="body-history-columns" aria-hidden="true">
                <span>Data</span>
                <span>{kind === "peso" ? "Peso" : "Medida"}</span>
                <span>Variação</span>
                <span>Ações</span>
              </div>
              {entries.map(record)}
            </>
          ) : (
            <p className="empty-state">
              Sem registros neste período. Você pode consultar outro intervalo.
            </p>
          )}
          <nav className="body-pagination" aria-label="Paginação">
            {page > 1 && (
              <Link prefetch={false} href={`${base}&pagina=${page - 1}`}>
                Anteriores
              </Link>
            )}
            {page * 20 < metrics.entries.length && (
              <Link prefetch={false} href={`${base}&pagina=${page + 1}`}>
                Próximos
              </Link>
            )}
          </nav>
        </section>
        <section className="content-card body-method">
          <h2>Composição e IMC</h2>
          <strong>—</strong>
          <p>
            Sem dados e método apropriados para apresentar estes indicadores.
          </p>
          <p className="field-hint">
            Peso e medidas são registros independentes de uma avaliação de
            composição corporal.
          </p>
        </section>
        <section className="content-card body-quick-actions">
          <h2>Ações rápidas</h2>
          {editable && register}
          <Link
            className="button-secondary"
            href={`/painel/${kind === "peso" ? "medidas" : "peso"}?projeto=${selected.id}&data=${date}&registrar=1#novo-registro`}
            prefetch={false}
          >
            <Ruler size={19} aria-hidden="true" />
            {kind === "peso"
              ? editable
                ? "Registrar medidas"
                : "Consultar medidas"
              : "Consultar peso"}
          </Link>
          <Link
            className="body-photo-link"
            prefetch={false}
            href={`/painel/fotos?projeto=${selected.id}`}
          >
            <Camera size={18} aria-hidden="true" />
            Fotografias privadas
          </Link>
        </section>
      </div>
      {editable && (
        <details
          className="content-card record-create body-create"
          id="novo-registro"
          open={registrar === "1"}
        >
          <summary>
            {kind === "peso"
              ? "Registrar ou atualizar peso"
              : "Registrar medidas"}
          </summary>
          <p className="intro">
            Este registro será salvo no projeto ativo “{active?.name}”.
          </p>
          <ActionForm
            action={saveRecord}
            submit={kind === "peso" ? "Salvar peso" : "Salvar medidas"}
            resetOnSuccess
            feedbackMode="modal"
          >
            <RecordFields
              kind={kind}
              date={formDate}
              min={selected.starts_on}
              max={max}
            />
          </ActionForm>
        </details>
      )}
    </div>
  );
}
