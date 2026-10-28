import { SleepCard } from "@/components/sleep-card";
import { garminConfig } from "@/lib/garmin-config";
import type { SleepRecord, SleepSettings } from "@/lib/sleep";
import { WeightChart } from "@/components/weight-chart";
import { CalorieBalance } from "@/components/calorie-balance";
import Link from "next/link";
import {
  Droplets,
  Utensils,
  Dumbbell,
  ChartNoAxesCombined,
  Camera,
  Ruler,
  FolderOpen,
  ArrowRight,
  History,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { LogoutButton } from "@/components/logout-button";
import { OfflineSnapshot } from "@/components/offline-snapshot";
import { dashboardPlan } from "@/lib/dashboard-plan";
import { projectContext } from "@/lib/data";
import type { Entry, Summary } from "@/lib/records";
import { statusLabel, formatDate, today, isDate, number } from "@/lib/domain";
export const metadata = { title: "Seu painel" };
export const dynamic = "force-dynamic";
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string }>;
}) {
  const params = await searchParams,
    { selected, active, client, user } = await projectContext(params.projeto);
  const date =
    params.data && isDate(params.data)
      ? params.data
      : selected?.ends_on && selected.ends_on < today()
        ? selected.ends_on
        : today();
  let sleepRecord: SleepRecord | null = null;
  let sleepSettings: SleepSettings | null = null;
  const sleepConfigured = Boolean(garminConfig(user.id));
  const activities: Entry[] = [];
  let weights: Entry[] = [];
  let summary: Summary | null = null;
  let diet: Awaited<ReturnType<typeof dashboardPlan>> = null;
  if (selected) {
    const [result, comparison, weightResult, sleep, settings] =
      await Promise.all([
        client.rpc("project_summary", { p_project: selected.id, p_date: date }),
        dashboardPlan(client, selected.id, date),
        client
          .from("weights")
          .select("*")
          .eq("project_id", selected.id)
          .lte("logged_on", date)
          .order("logged_on", { ascending: false })
          .limit(30)
          .returns<Entry[]>(),
        client
          .from("sleep_records")
          .select("*")
          .eq("project_id", selected.id)
          .eq("logged_on", date)
          .maybeSingle(),
        sleepConfigured
          ? client
              .from("garmin_sleep_settings")
              .select("enabled,last_attempt_at,last_success_at,last_error_at")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
    const { data, error } = result;
    diet = comparison;
    if (sleep.error || settings.error)
      throw Error("Não foi possível carregar o sono.");
    sleepRecord = sleep.data as SleepRecord | null;
    sleepSettings = settings.data as SleepSettings | null;
    if (weightResult.error)
      throw new Error("Falha ao carregar evolução do peso");
    weights = weightResult.data ?? [];
    if (error) throw new Error("Falha ao carregar indicadores");
    summary = data as Summary;
    // Paginate so a busy day is never silently truncated by the API row limit.
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error: activityError } = await client
        .from("activities")
        .select("id,name,modality,external_type,duration_min,distance_km,kcal")
        .eq("project_id", selected.id)
        .eq("logged_on", date)
        .order("id")
        .range(offset, offset + 499)
        .returns<Entry[]>();
      if (activityError) throw Error("Falha ao carregar atividades do dia");
      activities.push(...(rows ?? []));
      if (!rows || rows.length < 500) break;
    }
  }
  const cards = summary
    ? [
        {
          label: "Alimentação",
          module: "alimentacao",
          empty: summary.kcal === null,
          icon: Utensils,
          value:
            summary.kcal === null
              ? Number(summary.food_count) > 0
                ? "Calorias não informadas"
                : "Sem refeições registradas"
              : `${number(summary.kcal)} kcal`,
          detail:
            summary.missing_kcal > 0 && summary.kcal !== null
              ? "Subtotal parcial, faltam valores"
              : "Valores informados no diário",
        },
        {
          label: "Hidratação",
          module: "agua",
          empty: summary.water_ml === null,
          icon: Droplets,
          value:
            summary.water_ml === null
              ? "Sem registros"
              : `${number(summary.water_ml, 0)} ml`,
          detail:
            summary.water_goal === null
              ? "Meta não configurada"
              : `Meta vigente: ${number(summary.water_goal, 0)} ml`,
        },
        {
          label: "Atividades",
          module: "atividades",
          empty: activities.length === 0,
          icon: Dumbbell,
          value: activities.length
            ? `${number(
                activities.reduce(
                  (sum, row) => sum + (row.duration_min ?? 0),
                  0,
                ),
                1,
              )} min`
            : "Sem atividades registradas",
          detail:
            activities.length === 1
              ? activities[0].name || "1 atividade no dia"
              : `${activities.length} atividades no dia`,
        },
        {
          label: "Peso",
          module: "peso",
          empty: summary.weight === null,
          icon: ChartNoAxesCombined,
          value:
            summary.weight === null
              ? "Sem peso registrado"
              : `${number(summary.weight, 2)} kg`,
          detail: summary.weight_date
            ? `Registrado em ${formatDate(summary.weight_date)}`
            : "Seu ritmo, sua evolução",
        },
      ]
    : [];
  return (
    <>
      <section className="welcome dashboard-welcome">
        <p className="eyebrow">SEU ESPAÇO</p>
        <h1>Olá, vamos cuidar de você?</h1>
        <p className="intro">Consistência hoje para um amanhã melhor.</p>
      </section>
      <Link
        className="button-secondary meal-record-link dashboard-history"
        href="/painel/historico"
      >
        <History size={20} aria-hidden="true" />
        <span>
          <strong>Histórico geral</strong>
          <small>Veja os registros do seu projeto ativo por dia</small>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      {selected && summary ? (
        <>
          <section className="project-card dashboard-hero">
            <div className="project-content">
              <span className="status">
                <span
                  className={`status-dot status-${selected.status.toLowerCase()}`}
                />
                {statusLabel[selected.status]}
              </span>
              <h2>{selected.name}</h2>
              <p>
                Desde {formatDate(selected.starts_on)}
                {selected.ends_on && ` até ${formatDate(selected.ends_on)}`}
              </p>
              <p className="intro">
                {selected.weight_mode === "target"
                  ? `Peso alvo: ${number(selected.weight_min!, 2)} kg`
                  : selected.weight_mode === "range"
                    ? `Faixa de peso: ${number(selected.weight_min!, 2)} a ${number(selected.weight_max!, 2)} kg`
                    : selected.weight_mode === "track"
                      ? "Peso em acompanhamento, sem alvo numérico."
                      : "Meta de peso não configurada."}
              </p>
              <Link
                className="button-secondary dashboard-manage"
                href="/painel/projetos"
              >
                <FolderOpen size={20} aria-hidden="true" />
                <span>Gerenciar projetos</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>
          {selected.status !== "ACTIVE" && (
            <p className="readonly-note">
              {selected.status === "DRAFT"
                ? "Este é um rascunho e ainda não recebe registros."
                : "Histórico somente leitura."}{" "}
              {active
                ? `Novos registros são destinados ao projeto ativo “${active.name}”.`
                : "Ative um projeto para começar a registrar."}
            </p>
          )}
          <section
            className="daily-nutrition content-card"
            aria-label="Resumo alimentar do dia"
          >
            <div className="daily-calories">
              <span className="icon-box">
                <Utensils size={22} aria-hidden="true" />
              </span>
              <div>
                <span className="muted">Alimentação de {formatDate(date)}</span>
                <p
                  className={`daily-metric${summary.kcal === null ? " daily-empty" : ""}`}
                >
                  {summary.kcal === null
                    ? "Não informado"
                    : number(summary.kcal)}
                  {summary.kcal !== null && <small> kcal</small>}
                </p>
                <span className="muted">
                  {summary.missing_kcal > 0 && summary.kcal !== null
                    ? "Subtotal parcial"
                    : "Valores informados no diário"}
                </span>
              </div>
            </div>
            <dl className="daily-macros">
              {(
                [
                  ["Proteínas", summary.protein, summary.missing_protein],
                  ["Carboidratos", summary.carbs, summary.missing_carbs],
                  ["Gorduras", summary.fat, summary.missing_fat],
                ] as const
              ).map(([label, value, missing]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {value === null ? "Não informado" : `${number(value)} g`}
                    {value !== null && missing > 0 && (
                      <small className="muted"> · subtotal parcial</small>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {diet && (
              <div className="dashboard-diet-comparison">
                <h3>Plano e consumo do dia</h3>
                <CalorieBalance
                  consumed={summary.kcal}
                  planned={diet.totals.kcal.value}
                  partial={
                    diet.totals.kcal.missing > 0 || summary.missing_kcal > 0
                  }
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
                  Refeições com registros contam as categorias do diário. Cópias
                  e lançamentos manuais só contam no plano quando vinculados a
                  uma refeição dele.
                </p>
                <Link
                  className="button-secondary meal-record-link"
                  href={`/painel/plano?projeto=${selected.id}&data=${date}`}
                >
                  <Utensils size={20} aria-hidden="true" />
                  <span>Consultar plano alimentar</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>
          <section className="areas-section" aria-labelledby="daily-title">
            <div className="section-heading">
              <h2 id="daily-title">Seu dia, por inteiro</h2>
              <span>{formatDate(date)}</span>
            </div>
            <div className="area-grid">
              {cards.map(
                ({ label, module, icon: Icon, value, detail, empty }) => (
                  <Link
                    className={`area-card metric-card metric-${module}`}
                    key={module}
                    href={`/painel/${module}?projeto=${selected.id}&data=${date}`}
                  >
                    <span className="icon-box">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3>
                      {label}
                      <span aria-hidden="true">›</span>
                    </h3>
                    <p
                      className={`metric-value${empty ? " metric-empty" : ""}`}
                    >
                      {value}
                    </p>
                    <p>{detail}</p>
                    {module === "peso" && weights.length >= 2 && (
                      <>
                        <p className="metric-comparison">
                          {number(weights.at(-1)!.kg!, 2)} →{" "}
                          {number(weights[0].kg!, 2)} kg ·{" "}
                          {Number(weights[0].kg) - Number(weights.at(-1)!.kg) >
                          0
                            ? "+"
                            : ""}
                          {number(
                            Number(weights[0].kg) - Number(weights.at(-1)!.kg),
                            2,
                          )}{" "}
                          kg no período
                        </p>
                        <WeightChart rows={weights} />
                      </>
                    )}
                    {module === "atividades" && activities.length > 0 && (
                      <dl className="activity-day-totals">
                        {(
                          [
                            ["Distância", "distance_km", "km"],
                            ["Calorias", "kcal", "kcal"],
                          ] as const
                        ).map(([label, field, unit]) => {
                          const known = activities.filter(
                            (row) => row[field] != null,
                          );
                          return (
                            <div key={field}>
                              <dt>{label}</dt>
                              <dd>
                                {known.length
                                  ? `${number(
                                      known.reduce(
                                        (sum, row) => sum + row[field]!,
                                        0,
                                      ),
                                      field === "distance_km" ? 2 : 1,
                                    )} ${unit}`
                                  : field === "distance_km"
                                    ? "Não informada"
                                    : "Não informadas"}
                              </dd>
                              {known.length > 0 &&
                                known.length < activities.length && (
                                  <small>Subtotal parcial</small>
                                )}
                            </div>
                          );
                        })}
                      </dl>
                    )}
                    {module === "atividades" &&
                      selected.sessions_goal !== null && (
                        <div className="metric-comparison">
                          <span>
                            Semana · {summary.sessions ?? 0}/
                            {selected.sessions_goal} sessões
                          </span>
                          <progress
                            value={summary.sessions ?? 0}
                            max={selected.sessions_goal || 1}
                            aria-label="Sessões registradas em relação à meta semanal"
                          />
                        </div>
                      )}
                    {module === "alimentacao" && diet && (
                      <p className="metric-comparison">
                        {summary.kcal === null
                          ? "Sem consumo registrado"
                          : `${number(summary.kcal)} kcal registradas`}{" "}
                        ·{" "}
                        {diet.totals.kcal.value === null
                          ? "Plano sem calorias informadas"
                          : `${number(diet.totals.kcal.value)} kcal planejadas`}
                      </p>
                    )}
                    {module === "agua" &&
                      summary.water_ml !== null &&
                      summary.water_goal !== null && (
                        <ProgressRing
                          value={summary.water_ml}
                          max={summary.water_goal}
                          label="Progresso da meta diária de hidratação"
                        >
                          <Droplets size={18} aria-hidden="true" />
                        </ProgressRing>
                      )}
                  </Link>
                ),
              )}
            </div>
          </section>
          {(sleepConfigured || sleepRecord) && (
            <SleepCard
              row={sleepRecord}
              date={date}
              project={selected.id}
              settings={sleepSettings}
              configured={sleepConfigured}
              editable={
                selected.status === "ACTIVE" && selected.id === active?.id
              }
            />
          )}
          <nav className="evolution-actions" aria-label="Evolução corporal">
            <Link
              className="button-secondary"
              href={`/painel/medidas?projeto=${selected.id}`}
            >
              <span className="project-setting-icon" aria-hidden="true">
                <Ruler size={20} />
              </span>
              <span>Medidas corporais</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              className="button-secondary"
              href={`/painel/fotos?projeto=${selected.id}`}
            >
              <span className="project-setting-icon" aria-hidden="true">
                <Camera size={20} />
              </span>
              <span>Fotografias privadas</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </nav>
          <OfflineSnapshot
            project={selected.name}
            date={formatDate(date)}
            items={cards.map((card) => ({
              label: card.label,
              value: card.value,
            }))}
          />
        </>
      ) : (
        <div className="content-card">
          <h2>Vamos preparar seu primeiro projeto?</h2>
          <p className="intro">
            Escolha pelo menos uma meta de água, peso ou sessões para começar.
          </p>
          <Link className="button-primary" href="/painel/projetos">
            Configurar meu primeiro projeto
          </Link>
        </div>
      )}
      <LogoutButton />
    </>
  );
}
