import { TrainingDiary } from "@/components/training/training-diary";
import { trainingEntries, recentTraining } from "@/lib/training-data";
import { trainingMetrics } from "@/lib/training-metrics";
import { WaterDiary } from "@/components/hydration/water-diary";
import { WaterRecordCard } from "@/components/hydration/water-record-card";
import { ContainerManager } from "@/components/hydration/container-manager";
import { waterContainers, hydrationEntries } from "@/lib/hydration-data";
import { hydrationWeek } from "@/lib/hydration-metrics";
import { FoodDiary } from "@/components/nutrition/food-diary";
import { foodDayEntries } from "@/lib/food-day-data";
import { ActivityRecordCard } from "@/components/activity-record-card";
import { GarminConnection } from "@/components/garmin-connection";
import { garminConfig } from "@/lib/garmin-config";
import type { ReactNode } from "react";
import { dashboardPlan } from "@/lib/dashboard-plan";
import { ActionDisclosure } from "@/components/action-disclosure";
import {
  PencilLine,
  Trash2,
  ChevronRight,
  ChevronDown,
  History,
} from "lucide-react";
import { ReturnLink } from "@/components/return-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projectContext } from "@/lib/data";
import { today, isDate, formatDate, number } from "@/lib/domain";
import {
  isModule,
  modules,
  type Module,
  type Entry,
  type Summary,
  categories,
  modalities,
  measurements,
  activityModality,
  nutrients,
  units,
} from "@/lib/records";
import { ActionForm } from "@/components/forms/action-form";
import { RecordFields } from "@/components/forms/record-fields";
import { WeightChart } from "@/components/weight-chart";
import { saveRecord, deleteRecord } from "./actions";
function RecordPresentation({
  kind,
  row,
  children,
  editable,
  initiallyOpen = false,
}: {
  kind: Module;
  row: Entry;
  children: ReactNode;
  editable: boolean;
  initiallyOpen?: boolean;
}) {
  if (kind === "atividades")
    return (
      <ActivityRecordCard row={row} initiallyOpen={initiallyOpen}>
        {children}
      </ActivityRecordCard>
    );
  if (kind === "agua")
    return (
      <WaterRecordCard row={row} editable={editable}>
        {children}
      </WaterRecordCard>
    );
  if (kind !== "alimentacao") return <>{children}</>;
  const kcal =
    row.kcal == null
      ? null
      : (Number(row.kcal) * Number(row.amount)) / Number(row.reference_amount);
  return (
    <details className="food-record-details">
      <summary>
        <span>
          <strong role="heading" aria-level={3}>
            {entryText(kind, row)}
          </strong>
          <small>
            {formatDate(row.logged_on)} · {categories[row.category!]}
          </small>
        </span>
        <span className="food-record-calories">
          {kcal === null ? "Sem calorias informadas" : `${number(kcal)} kcal`}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="food-record-body">{children}</div>
    </details>
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  return { title: isModule(modulo) ? modules[modulo].title : "Registros" };
}
function entryText(kind: Module, row: Entry) {
  if (kind === "agua")
    return `${number(row.volume_ml!, 0)} ml${row.container_label ? ` · ${row.container_label}` : ""}${row.logged_time ? ` · ${row.logged_time.slice(0, 5)}` : ""}`;
  if (kind === "peso") return `${number(row.kg!, 2)} kg`;
  if (kind === "medidas")
    return `${measurements[row.measurement_type!]} · ${number(row.value_cm!, 2)} cm`;
  if (kind === "atividades")
    return `${row.name ? `${row.name} · ` : ""}${activityModality(row)} · ${number(row.duration_min!, 2)} min${row.distance_km != null ? ` · ${number(row.distance_km, 3)} km` : ""}${row.kcal == null ? "" : ` · ${number(row.kcal)} kcal`}${row.external_provider === "garmin" ? " · Garmin Connect" : ""}`;
  return `${row.name} · ${number(row.amount!, 3)} ${units[row.unit!]}`;
}
export default async function Records({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<{
    projeto?: string;
    data?: string;
    pagina?: string;
    refeicao_excluida?: string;
    registrar?: string;
    refeicao?: string;
    volume?: string;
    atividade?: string;
    acao?: string;
    modalidade?: string;
  }>;
}) {
  const { modulo } = await params;
  if (!isModule(modulo)) notFound();
  const filters = await searchParams;
  const date = filters.data && isDate(filters.data) ? filters.data : today();
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(filters.pagina) || 1)),
  );
  const context = await projectContext(filters.projeto),
    { selected, active, client, user, projects } = context;
  const containersPromise =
    modulo === "agua" ? waterContainers(client) : Promise.resolve([]);
  if (!selected)
    return (
      <section className="welcome">
        <h1>{modules[modulo].title}</h1>
        <p className="intro">Crie e ative seu primeiro projeto para começar.</p>
        <Link className="button-primary" href="/painel/projetos">
          Configurar projeto
        </Link>
        {modulo === "agua" && (
          <ContainerManager containers={await containersPromise} />
        )}
      </section>
    );
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const daily = modulo === "agua" || modulo === "alimentacao";
  let query = client
    .from(modules[modulo].table)
    .select("*")
    .eq("project_id", selected.id);
  query =
    modulo === "agua"
      ? query
          .order("logged_time", { ascending: true, nullsFirst: false })
          .order("id", { ascending: false })
      : query
          .order("logged_on", { ascending: false })
          .order("id", { ascending: false });
  query = query.range((page - 1) * 20, page * 20);
  if (daily || modulo === "atividades" || filters.data)
    query = query.eq("logged_on", date);
  const [
    entries,
    totals,
    graph,
    diet,
    trainingRows,
    allFoods,
    containers,
    waterRows,
    recentActivities,
  ] = await Promise.all([
    query.returns<Entry[]>(),
    client.rpc("project_summary", {
      p_project: selected.id,
      p_date: date,
    }),
    modulo === "peso"
      ? client
          .from("weights")
          .select("*")
          .eq("project_id", selected.id)
          .lte("logged_on", date)
          .order("logged_on", { ascending: false })
          .limit(30)
          .returns<Entry[]>()
      : Promise.resolve({ data: [] as Entry[], error: null }),
    modulo === "alimentacao"
      ? dashboardPlan(client, selected.id, date)
      : Promise.resolve(null),
    modulo === "atividades"
      ? trainingEntries(client, selected.id, date)
      : Promise.resolve([] as Entry[]),
    modulo === "alimentacao"
      ? foodDayEntries(client, selected.id, date)
      : Promise.resolve([] as Entry[]),
    containersPromise,
    modulo === "agua"
      ? hydrationEntries(client, selected.id, date)
      : Promise.resolve([] as Entry[]),
    modulo === "atividades"
      ? recentTraining(client, selected.id, date)
      : Promise.resolve([] as Entry[]),
  ]);
  if (entries.error) throw new Error("Falha ao carregar registros");
  if (totals.error) throw new Error("Falha ao carregar totais");
  if (graph.error) throw new Error("Falha no gráfico");
  const rows = (entries.data ?? []).slice(0, 20),
    hasMore = (entries.data?.length ?? 0) > 20;
  const summary = totals.data as Summary;
  const link = (nextPage: number) =>
    `/painel/${modulo}?projeto=${selected.id}&pagina=${nextPage}${daily || filters.data ? `&data=${date}` : ""}`;
  const chart: Entry[] = graph.data ?? [];
  const renderRecord = (row: Entry) => (
    <article
      key={row.id}
      id={modulo === "atividades" ? `atividade-${row.id}` : undefined}
      className={`content-card${modulo === "alimentacao" ? " food-record" : modulo === "atividades" ? " activity-record" : ""}`}
    >
      <RecordPresentation
        kind={modulo}
        row={row}
        editable={editable}
        initiallyOpen={modulo === "atividades" && filters.atividade === row.id}
      >
        {modulo !== "atividades" && (
          <p className="eyebrow">
            {formatDate(row.logged_on)}
            {row.category && ` · ${categories[row.category]}`}
          </p>
        )}
        {modulo !== "alimentacao" &&
          modulo !== "atividades" &&
          modulo !== "agua" && <h3>{entryText(modulo, row)}</h3>}
        {row.notes && <p className="intro">{row.notes}</p>}
        {modulo === "alimentacao" && (
          <>
            <p className="intro">
              Referência: {number(row.reference_amount!, 3)} {units[row.unit!]}.
              Fonte: {row.source}
            </p>
            <p>
              {Object.entries(nutrients)
                .map(([key, label]) => {
                  const value = row[key as keyof Entry];
                  return `${label}: ${value == null ? "não informado" : `${number((Number(value) * Number(row.amount)) / Number(row.reference_amount))} ${key === "kcal" ? "kcal" : "g"}`}`;
                })
                .join(" · ")}
            </p>
          </>
        )}
        {editable && (
          <>
            {modulo !== "peso" && (
              <ActionDisclosure
                title="Editar registro"
                id={
                  modulo === "atividades"
                    ? `edit-activity-${row.id}`
                    : undefined
                }
                initiallyOpen={
                  modulo === "atividades" &&
                  filters.atividade === row.id &&
                  filters.acao === "editar"
                }
                icon={PencilLine}
                className="record-action"
              >
                <ActionForm action={saveRecord} submit="Salvar alteração">
                  <RecordFields
                    kind={modulo}
                    entry={row}
                    min={selected.starts_on}
                    max={
                      selected.ends_on && selected.ends_on < today()
                        ? selected.ends_on
                        : today()
                    }
                  />
                </ActionForm>
              </ActionDisclosure>
            )}
            <ActionDisclosure
              title="Excluir registro"
              id={
                modulo === "atividades"
                  ? `delete-activity-${row.id}`
                  : undefined
              }
              initiallyOpen={
                modulo === "atividades" &&
                filters.atividade === row.id &&
                filters.acao === "excluir"
              }
              icon={Trash2}
              className="record-action destructive-action"
            >
              <ActionForm action={deleteRecord} submit="Confirmar exclusão">
                <input type="hidden" name="module" value={modulo} />
                <input type="hidden" name="id" value={row.id} />
                <label className="checkbox-label">
                  <input name="confirm" type="checkbox" required />
                  Confirmo a exclusão deste registro.
                </label>
              </ActionForm>
            </ActionDisclosure>
          </>
        )}
      </RecordPresentation>
    </article>
  );
  if (modulo === "alimentacao")
    return (
      <FoodDiary
        client={client}
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        summary={summary}
        diet={diet}
        page={page}
        rows={rows}
        allRows={allFoods}
        hasMore={hasMore}
        filters={filters}
        renderRecord={renderRecord}
      />
    );

  if (modulo === "agua") {
    const volume = Number(filters.volume);
    return (
      <WaterDiary
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        summary={summary}
        rows={rows}
        page={page}
        hasMore={hasMore}
        containers={containers}
        days={hydrationWeek(waterRows, date, context.goals)}
        registrar={filters.registrar}
        preset={
          Number.isInteger(volume) && volume >= 1 && volume <= 5000
            ? volume
            : undefined
        }
        renderRecord={renderRecord}
      />
    );
  }

  if (modulo === "atividades") {
    const preset =
      filters.modalidade && Object.hasOwn(modalities, filters.modalidade)
        ? (filters.modalidade as Entry["modality"])
        : undefined;
    return (
      <TrainingDiary
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        metrics={trainingMetrics(trainingRows, date, today())}
        recent={recentActivities}
        rows={rows}
        page={page}
        hasMore={hasMore}
        registrar={filters.registrar}
        preset={preset}
        renderRecord={renderRecord}
        connection={garminConfig(user.id) ? <GarminConnection /> : undefined}
      />
    );
  }

  return (
    <div className={`module-page module-${modulo}`}>
      <section className="welcome module-welcome">
        <ReturnLink href={`/painel?projeto=${selected.id}`}>
          Voltar ao dashboard
        </ReturnLink>
        <p className="eyebrow">{selected.name}</p>
        <h1>
          {modules[modulo].title}
          <span className="accent">.</span>
        </h1>
        <p className="intro">{modules[modulo].description}</p>
      </section>
      {!editable && (
        <p className="readonly-note">
          {selected.status === "DRAFT"
            ? "Rascunhos não recebem registros."
            : "Histórico somente leitura."}{" "}
          {active && (
            <Link href={`/painel/${modulo}?projeto=${active.id}`}>
              Registrar no projeto ativo “{active.name}” →
            </Link>
          )}
        </p>
      )}
      {(modulo === "peso" || modulo === "medidas") && (
        <nav className="evolution-tabs" aria-label="Evolução corporal">
          <Link
            aria-current={modulo === "peso" ? "page" : undefined}
            href={`/painel/peso?projeto=${selected.id}`}
          >
            Peso
          </Link>
          <Link
            aria-current={modulo === "medidas" ? "page" : undefined}
            href={`/painel/medidas?projeto=${selected.id}`}
          >
            Medidas
          </Link>
          <Link href={`/painel/fotos?projeto=${selected.id}`}>Fotos</Link>
        </nav>
      )}

      {editable && (
        <details
          id="novo-registro"
          open={filters.registrar === "1"}
          className="content-card record-create"
        >
          <summary>
            {modulo === "peso"
              ? "Registrar ou atualizar peso"
              : modulo === "medidas"
                ? "Registrar medidas"
                : "Registrar atividade"}
          </summary>
          <p className="intro">
            Este registro será salvo no projeto ativo “{active?.name}”.
          </p>
          <ActionForm
            action={saveRecord}
            submit={
              modulo === "peso"
                ? "Salvar peso"
                : modulo === "medidas"
                  ? "Salvar medidas"
                  : "Salvar registro"
            }
          >
            <RecordFields
              kind={modulo}
              min={selected.starts_on}
              max={
                selected.ends_on && selected.ends_on < today()
                  ? selected.ends_on
                  : today()
              }
              date={date}
            />
          </ActionForm>
        </details>
      )}
      <Link
        className="button-secondary meal-record-link"
        href="/painel/historico"
      >
        <History size={20} aria-hidden="true" />
        <span>Consultar histórico geral</span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>

      {modulo === "peso" && (
        <section className="content-card">
          <h2>
            {summary.weight === null
              ? "Sem peso registrado"
              : `${number(summary.weight, 2)} kg`}
          </h2>
          {summary.weight_date && (
            <p className="intro">
              Último registro até a data consultada:{" "}
              {formatDate(summary.weight_date)}
            </p>
          )}
          <WeightChart rows={chart} />
        </section>
      )}
      <section
        id="registros-do-dia"
        className="records-section"
        aria-label="Histórico de registros"
      >
        <h2>{daily || filters.data ? "Registros do dia" : "Histórico"}</h2>
        {!rows.length && (
          <p className="intro">
            {!daily && filters.data
              ? `Nenhum registro em ${formatDate(date)}. O resumo pode mostrar o último registro anterior a essa data. Consulte outras datas no histórico geral.`
              : "Sem registros para esta consulta."}
          </p>
        )}

        {rows.map(renderRecord)}
      </section>
      <nav className="panel-nav" aria-label="Paginação">
        {page > 1 && <Link href={link(page - 1)}>Anteriores</Link>}
        {hasMore && <Link href={link(page + 1)}>Próximos</Link>}
      </nav>
    </div>
  );
}
