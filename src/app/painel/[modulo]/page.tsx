import type { ReactNode } from "react";
import { dashboardPlan } from "@/lib/dashboard-plan";
import { ManualMealRecorder } from "@/components/manual-meal-recorder";
import { PlanMealRecorder } from "@/components/plan-meal-recorder";
import { ActionDisclosure } from "@/components/action-disclosure";
import {
  PencilLine,
  Trash2,
  FileUp,
  FileText,
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
  measurements,
  modalities,
  nutrients,
  units,
} from "@/lib/records";
import { ActionForm } from "@/components/forms/action-form";
import { RecordFields } from "@/components/forms/record-fields";
import { FoodConveniences } from "@/components/food-conveniences";
import { ProgressRing } from "@/components/progress-ring";
import { Droplets } from "lucide-react";
import { WeightChart } from "@/components/weight-chart";
import { saveRecord, deleteRecord } from "./actions";
function RecordPresentation({
  kind,
  row,
  children,
}: {
  kind: Module;
  row: Entry;
  children: ReactNode;
}) {
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
    return `${modalities[row.modality!]} · ${number(row.duration_min!, 2)} min${row.distance_km != null ? ` · ${number(row.distance_km, 3)} km` : ""}`;
  return `${row.name} · ${number(row.amount!, 3)} ${units[row.unit!]}`;
}
export default async function Records({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<{ projeto?: string; data?: string; pagina?: string }>;
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
    { selected, active, client } = context;
  if (!selected)
    return (
      <section className="welcome">
        <h1>{modules[modulo].title}</h1>
        <p className="intro">Crie e ative seu primeiro projeto para começar.</p>
        <Link className="button-primary" href="/painel/projetos">
          Configurar projeto
        </Link>
      </section>
    );
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const daily = modulo === "agua" || modulo === "alimentacao";
  let query = client
    .from(modules[modulo].table)
    .select("*")
    .eq("project_id", selected.id)
    .order("logged_on", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20);
  if (daily || filters.data) query = query.eq("logged_on", date);
  const [entries, totals, graph, calendar, diet] = await Promise.all([
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
      ? client.rpc("food_calendar", {
          p_project: selected.id,
          p_date: date,
        })
      : Promise.resolve({ data: [], error: null }),
    modulo === "alimentacao"
      ? dashboardPlan(client, selected.id, date)
      : Promise.resolve(null),
  ]);
  if (entries.error) throw new Error("Falha ao carregar registros");
  if (totals.error) throw new Error("Falha ao carregar totais");
  if (graph.error) throw new Error("Falha no gráfico");
  if (calendar.error) throw new Error("Falha no calendário");
  const rows = (entries.data ?? []).slice(0, 20),
    hasMore = (entries.data?.length ?? 0) > 20;
  const summary = totals.data as Summary;
  const link = (nextPage: number) =>
    `/painel/${modulo}?projeto=${selected.id}&pagina=${nextPage}${daily || filters.data ? `&data=${date}` : ""}`;
  const chart: Entry[] = graph.data ?? [];
  const days: { day: string; items: number; confirmed: boolean }[] =
    calendar.data ?? [];
  const calendarStatus =
    modulo === "alimentacao"
      ? await Promise.all(
          days.map(async (day) => ({
            day: day.day,
            complete:
              day.day === date
                ? diet?.complete
                : (await dashboardPlan(client, selected.id, day.day))?.complete,
          })),
        )
      : [];
  const renderRecord = (row: Entry) => (
    <article
      key={row.id}
      className={`content-card${modulo === "alimentacao" ? " food-record" : ""}`}
    >
      <RecordPresentation kind={modulo} row={row}>
        <p className="eyebrow">
          {formatDate(row.logged_on)}
          {row.category && ` · ${categories[row.category]}`}
        </p>
        {modulo !== "alimentacao" && <h3>{entryText(modulo, row)}</h3>}
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
      {modulo === "alimentacao" && (
        <Link
          className="plan-entry"
          href={`/painel/plano?projeto=${selected.id}&data=${date}`}
        >
          <span className="plan-entry-icon" aria-hidden="true">
            {diet ? <FileText size={24} /> : <FileUp size={24} />}
          </span>
          <span className="plan-entry-content">
            <strong>Meu plano alimentar</strong>
            <span>
              {diet
                ? "Plano salvo · consulte as refeições ou revise o planejamento."
                : "Importe seu PDF e confira calorias e nutrientes."}
            </span>
          </span>
          <ChevronRight
            className="plan-entry-chevron"
            size={20}
            aria-hidden="true"
          />
        </Link>
      )}
      {editable && modulo === "alimentacao" && (
        <ManualMealRecorder
          date={date}
          min={selected.starts_on}
          max={
            selected.ends_on && selected.ends_on < today()
              ? selected.ends_on
              : today()
          }
        />
      )}
      {editable && modulo !== "alimentacao" && (
        <details className="content-card record-create">
          <summary>
            {modulo === "peso"
              ? "Registrar ou atualizar peso"
              : modulo === "medidas"
                ? "Registrar medidas"
                : modulo === "agua"
                  ? "Adicionar consumo"
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
      {daily ? (
        <form className="filter-form">
          <input type="hidden" name="projeto" value={selected.id} />
          <label>
            Data
            <input
              type="date"
              name="data"
              defaultValue={daily || filters.data ? date : ""}
              max={today()}
            />
          </label>
          <button className="button-primary">Consultar</button>
        </form>
      ) : (
        <Link
          className="button-secondary meal-record-link"
          href="/painel/historico"
        >
          <History size={20} aria-hidden="true" />
          <span>Consultar histórico geral</span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      )}

      {modulo === "alimentacao" && diet && (
        <section className="planned-meals" aria-label="Refeições do plano">
          <h2>Suas refeições planejadas</h2>
          <p className="intro">
            Data consultada: {formatDate(date)}. Abra uma refeição do plano para
            registrar o que consumiu ou ajustar as porções. Para incluir outros
            alimentos, use “Registrar refeição”. Esses ajustes alteram apenas
            seu diário; o plano da nutricionista fica preservado.
          </p>
          {diet.document.meals.map(
            (meal, index) =>
              meal.enabled && (
                <PlanMealRecorder
                  key={`${diet.id}-${index}-${date}`}
                  plan={diet.id}
                  index={index}
                  meal={meal}
                  date={date}
                  min={selected.starts_on}
                  max={
                    selected.ends_on && selected.ends_on < today()
                      ? selected.ends_on
                      : today()
                  }
                  registered={diet.registeredMeals.includes(index)}
                  actual={diet.mealActuals[index]}
                  editable={editable}
                />
              ),
          )}
        </section>
      )}
      {modulo === "agua" && (
        <section className="content-card hydration-summary">
          <ProgressRing
            value={summary.water_ml}
            max={summary.water_goal}
            label="Progresso da hidratação na data consultada"
          >
            <Droplets size={24} aria-hidden="true" />
            <strong>
              {summary.water_ml === null
                ? "Sem registros"
                : `${number(summary.water_ml / 1000, 2)} L`}
            </strong>
            <span>
              {summary.water_goal === null
                ? "Sem meta"
                : `de ${number(summary.water_goal / 1000, 2)} L`}
            </span>
          </ProgressRing>
          <div className="hydration-detail">
            <h2>
              {summary.water_ml === null
                ? "Sem registros"
                : `${number(summary.water_ml, 0)} ml`}
            </h2>
            <p className="intro">
              {summary.water_goal === null
                ? "Meta não configurada"
                : `Meta de ${number(summary.water_goal, 0)} ml em ${formatDate(date)}`}
            </p>
            {summary.water_ml !== null && summary.water_goal !== null && (
              <>
                <progress
                  className="water-progress"
                  value={Math.min(summary.water_ml, summary.water_goal)}
                  max={summary.water_goal}
                  aria-label="Progresso da hidratação"
                />
                <p>
                  {number((summary.water_ml / summary.water_goal) * 100, 0)}% da
                  meta
                </p>
              </>
            )}
          </div>
        </section>
      )}
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
      {modulo === "atividades" && (
        <section className="content-card">
          <h2>
            {summary.sessions === null
              ? "Sem sessões registradas nesta semana"
              : `${summary.sessions} sessões na semana`}
          </h2>
          <p className="intro">
            {selected.sessions_goal === null
              ? "Meta semanal não configurada"
              : `Meta geral: ${selected.sessions_goal} sessões por semana`}
            . Dias sem registro não confirmam ausência de atividade.
          </p>
        </section>
      )}
      {modulo === "alimentacao" && (
        <>
          <nav className="food-calendar" aria-label="Calendário alimentar">
            {days.map((day) => (
              <Link
                key={day.day}
                href={`/painel/alimentacao?projeto=${selected.id}&data=${day.day}`}
                aria-current={day.day === date ? "date" : undefined}
              >
                <strong>{formatDate(day.day).slice(0, 5)}</strong>
                <span>
                  {calendarStatus.find((status) => status.day === day.day)
                    ?.complete
                    ? "Completo"
                    : Number(day.items) > 0
                      ? "Parcial"
                      : "Sem registros"}
                </span>
              </Link>
            ))}
          </nav>
          <section className="content-card">
            <h2>Totais de {formatDate(date)}</h2>
            <div className="nutrition-grid">
              {Object.entries(nutrients).map(([key, label]) => {
                const k = key as keyof typeof nutrients,
                  v = summary[k],
                  missing = Number(summary[`missing_${k}`]);
                return (
                  <div key={key}>
                    <span className="muted">{label}</span>
                    <strong
                      className={v === null ? "nutrition-empty" : undefined}
                    >
                      {v === null
                        ? "Não informado"
                        : `${number(v)} ${key === "kcal" ? "kcal" : "g"}`}
                    </strong>
                    {missing > 0 && v !== null && (
                      <span className="muted">
                        Subtotal parcial · {missing} sem valor
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="intro">
              {diet?.complete
                ? "Completo: todas as refeições do plano foram registradas."
                : Number(summary.food_count) > 0
                  ? "Parcial: o diário ainda não contém todas as refeições do plano."
                  : "Sem registros neste dia."}
            </p>
            <p className="field-hint">
              O status é atualizado automaticamente pelos registros. Sem plano
              salvo, não é possível determinar se todas as refeições foram
              feitas.
            </p>
          </section>
        </>
      )}
      {modulo === "alimentacao" && (
        <FoodConveniences
          client={client}
          project={selected.id}
          date={date}
          activeName={active?.name}
        />
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
        {modulo === "alimentacao" && (
          <p className="intro">
            {summary.food_count} alimentos neste dia. Abra uma refeição para ver
            os alimentos. Selecione um alimento para conferir a composição,
            editar ou excluir.
          </p>
        )}
        {modulo === "alimentacao"
          ? Object.entries(categories).map(([category, label]) => {
              const items = rows.filter((row) => row.category === category);
              if (!items.length) return null;
              const known = items.filter((row) => row.kcal != null);
              const kcal = known.reduce(
                (sum, row) =>
                  sum +
                  (Number(row.kcal) * Number(row.amount)) /
                    Number(row.reference_amount),
                0,
              );
              const partial =
                known.length !== items.length || hasMore || page > 1;
              return (
                <details
                  key={category}
                  className="content-card meal-record-group"
                >
                  <summary>
                    <span>
                      <strong>{label}</strong>
                      <small>
                        {items.length}{" "}
                        {items.length === 1 ? "alimento" : "alimentos"}
                        {hasMore || page > 1 ? " nesta página" : ""}
                      </small>
                    </span>
                    <span className="food-record-calories">
                      {known.length
                        ? `${number(kcal)} kcal`
                        : "Calorias não informadas"}
                      {partial && known.length > 0 && (
                        <small>Subtotal parcial</small>
                      )}
                    </span>
                    <ChevronDown size={20} aria-hidden="true" />
                  </summary>
                  <div className="meal-record-items">
                    {items.map(renderRecord)}
                  </div>
                </details>
              );
            })
          : rows.map(renderRecord)}
      </section>
      <nav className="panel-nav" aria-label="Paginação">
        {page > 1 && <Link href={link(page - 1)}>Anteriores</Link>}
        {hasMore && <Link href={link(page + 1)}>Próximos</Link>}
      </nav>
    </div>
  );
}
