import "@/components/dashboard/mobile.css";
import { DateNavigator } from "@/components/dashboard/date-navigator";
import { DashboardInsights } from "@/components/dashboard/insights";
import { dashboardDetails, type DashboardDetails } from "@/lib/dashboard-data";
import { periodStart } from "@/lib/dashboard-metrics";
import { ProjectSelector } from "@/components/dashboard/project-selector";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { currentPhasePlans } from "@/lib/phase-plan-data";
import type { StrengthPlan } from "@/lib/phase-plans";
import { DayOverview } from "@/components/daily/day-overview";
import { displayPreferences } from "@/lib/daily-data";
import type { ProjectPhase } from "@/lib/daily-followup";
import { SleepCard } from "@/components/sleep-card";
import { garminConfig } from "@/lib/garmin-config";
import type { SleepRecord, SleepSettings } from "@/lib/sleep";
import { WeightChart } from "@/components/weight-chart";
import Link from "next/link";
import {
  Droplets,
  Utensils,
  Dumbbell,
  ChartNoAxesCombined,
  Camera,
  Ruler,
  ArrowRight,
  History,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { LogoutButton } from "@/components/logout-button";
import { OfflineSnapshot } from "@/components/offline-snapshot";
import { dashboardPlan } from "@/lib/dashboard-plan";
import { projectContext } from "@/lib/data";
import { activityModality, type Entry, type Summary } from "@/lib/records";
import { formatDate, today, isDate, number } from "@/lib/domain";
export const metadata = { title: "Seu painel" };
export const dynamic = "force-dynamic";
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string; periodo?: string }>;
}) {
  const params = await searchParams,
    { selected, active, client, user, projects } = await projectContext(
      params.projeto,
    );
  const date =
    params.data && isDate(params.data)
      ? params.data
      : selected?.ends_on && selected.ends_on < today()
        ? selected.ends_on
        : today();
  const period = ["7", "30", "90", "project"].includes(params.periodo ?? "")
    ? params.periodo!
    : "30";
  const rangeStart = periodStart(date, period, selected?.starts_on ?? date);
  let extra: DashboardDetails | null = null;
  const preferences = await displayPreferences(client, user.id);
  let phase: ProjectPhase | null = null;
  let plannedWorkouts: string[] = [];
  let checkinRecorded = false;
  let followupAvailable = true;
  let sleepAvailable = true;
  let sleepRecord: SleepRecord | null = null;
  let sleepSettings: SleepSettings | null = null;
  const sleepConfigured = Boolean(garminConfig(user.id));
  const activities: Entry[] = [];
  let weights: Entry[] = [];
  let summary: Summary | null = null;
  let diet: Awaited<ReturnType<typeof dashboardPlan>> = null;
  if (selected) {
    const [
      result,
      comparison,
      weightResult,
      sleep,
      settings,
      phaseResult,
      checkinResult,
      planningResult,
      detailResult,
    ] = await Promise.all([
      client.rpc("project_summary", { p_project: selected.id, p_date: date }),
      dashboardPlan(client, selected.id, date),
      (async () => {
        const rows: Entry[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await client
            .from("weights")
            .select("*")
            .eq("project_id", selected.id)
            .gte("logged_on", rangeStart)
            .lte("logged_on", date)
            .order("logged_on", { ascending: false })
            .range(offset, offset + 499)
            .returns<Entry[]>();
          if (result.error) return { data: rows, error: result.error };
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 500)
            return { data: rows, error: null };
        }
      })(),
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
      client
        .from("project_phases")
        .select("*")
        .eq("project_id", selected.id)
        .lte("starts_on", date)
        .gte("ends_on", date)
        .maybeSingle<ProjectPhase>(),
      client
        .from("daily_checkins")
        .select("id")
        .eq("project_id", selected.id)
        .eq("logged_on", date)
        .maybeSingle(),
      currentPhasePlans(client, selected.id, date).catch(() => null),
      dashboardDetails(client, selected.id, date),
    ]);
    const { data, error } = result;
    diet = comparison;
    extra = detailResult;
    sleepAvailable = !sleep.error && !settings.error;
    followupAvailable = !phaseResult.error && !checkinResult.error;
    phase = phaseResult.data ?? null;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    plannedWorkouts = (
      (planningResult?.strength?.document as StrengthPlan | undefined)
        ?.workouts ?? []
    )
      .filter((w) => w.weekdays.includes(weekday))
      .map((w) => w.label);
    checkinRecorded = Boolean(checkinResult.data);
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
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const activityDuration = activities.reduce(
    (sum, row) => sum + Number(row.duration_min ?? 0),
    0,
  );
  const cards = summary
    ? [
        {
          label: "Alimentação",
          module: "alimentacao",
          empty: summary.kcal === null,
          icon: Utensils,
          value: !preferences.show_calories
            ? `${summary.food_count} alimentos registrados`
            : summary.kcal === null
              ? Number(summary.food_count) > 0
                ? "Calorias não informadas"
                : "Sem refeições registradas"
              : `${number(summary.kcal)} kcal`,
          detail: !preferences.show_calories
            ? "Seu diário, sem calorias no painel"
            : summary.missing_kcal > 0 && summary.kcal !== null
              ? "Subtotal parcial, faltam valores"
              : diet?.totals.kcal.value != null &&
                  diet.totals.kcal.missing === 0
                ? `de ${number(diet.totals.kcal.value)} kcal no plano`
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
              : summary.water_ml >= 1000
                ? `${number(summary.water_ml / 1000, 1)} L`
                : `${number(summary.water_ml, 0)} ml`,
          detail:
            summary.water_goal === null
              ? "Meta não configurada"
              : summary.water_goal >= 1000
                ? `de ${number(summary.water_goal / 1000, 1)} L`
                : `Meta vigente: ${number(summary.water_goal, 0)} ml`,
        },
        {
          label: "Treinos",
          module: "atividades",
          empty: activities.length === 0,
          icon: Dumbbell,
          value: activities.length
            ? `${number(activityDuration, 1)} min`
            : "Sem atividades registradas",
          detail:
            activities.length === 1
              ? activities[0].name || "1 atividade no dia"
              : `${activities.length} atividades no dia`,
        },
        {
          label: "Peso atual",
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
    <div className="v2-dashboard" data-photos-hidden={!preferences.show_photos}>
      <section className="welcome dashboard-welcome">
        <p className="eyebrow">{greeting} 👋</p>
        <h1>
          {date === today()
            ? "Aqui está o seu progresso hoje"
            : `Seu progresso em ${formatDate(date)}`}
        </h1>
        <p className="intro">Sua rotina, no seu ritmo.</p>
      </section>
      <Link
        prefetch={false}
        className="dashboard-preferences"
        href="/painel/perfil?secao=preferencias#display-title"
      >
        Escolher indicadores do painel
      </Link>
      <Link
        prefetch={false}
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
          <div className="v2-dashboard-toolbar">
            <h1 className="dashboard-day-title" id="daily-title">
              {date === today() ? "Visão de hoje" : "Visão do dia"}
            </h1>
            <ProjectSelector
              projects={projects}
              selected={selected}
              active={active}
              date={date}
            />
            <DateNavigator date={date} project={selected.id} period={period} />
          </div>
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
          <section className="areas-section" aria-labelledby="daily-title">
            <div className="area-grid">
              {cards
                .filter(
                  (card) => card.module !== "peso" || preferences.show_weight,
                )
                .map(({ label, module, icon: Icon, value, detail, empty }) => (
                  <Link
                    prefetch={false}
                    className={`area-card metric-card metric-${module}`}
                    key={module}
                    href={`/painel/${module}?projeto=${selected.id}&data=${date}`}
                  >
                    <span className="icon-box">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h2>
                      {label}
                      <span aria-hidden="true">›</span>
                    </h2>
                    <p
                      className={`metric-value${empty ? " metric-empty" : ""}`}
                    >
                      {module === "atividades" && activities.length > 0 ? (
                        <>
                          <span className="mobile-workout-name">
                            {activities.length === 1
                              ? activityModality(activities[0])
                              : `${activities.length} atividades`}
                          </span>
                          <span className="desktop-workout-duration">
                            {value}
                          </span>
                        </>
                      ) : (
                        value
                      )}
                    </p>
                    <p>{detail}</p>
                    {module === "peso" &&
                      summary.weight !== null &&
                      extra?.previousWeight?.kg != null && (
                        <p
                          className="mobile-weight-change"
                          title={`Comparação com ${formatDate(extra.previousWeight.logged_on)}`}
                        >
                          <strong>
                            {Number(summary.weight) -
                              Number(extra.previousWeight.kg) >
                            0
                              ? "+"
                              : ""}
                            {number(
                              Number(summary.weight) -
                                Number(extra.previousWeight.kg),
                              2,
                            )}{" "}
                            kg
                          </strong>
                          <span>vs. última medição</span>
                        </p>
                      )}
                    {module === "alimentacao" && preferences.show_calories && (
                      <dl className="v2-card-macros">
                        {(
                          [
                            [
                              "P",
                              summary.protein,
                              summary.missing_protein,
                              diet?.totals.protein,
                            ],
                            [
                              "C",
                              summary.carbs,
                              summary.missing_carbs,
                              diet?.totals.carbs,
                            ],
                            [
                              "G",
                              summary.fat,
                              summary.missing_fat,
                              diet?.totals.fat,
                            ],
                          ] as const
                        ).map(([label, value, missing, goal]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                              {value === null
                                ? "—"
                                : `${number(Number(value))} g`}
                              {value !== null && missing > 0 && (
                                <small> parcial</small>
                              )}
                              {value !== null &&
                                missing === 0 &&
                                goal?.value != null &&
                                goal.value > 0 &&
                                goal.missing === 0 && (
                                  <progress
                                    max={goal.value}
                                    value={Number(value)}
                                    aria-label={`${label === "P" ? "Proteínas" : label === "C" ? "Carboidratos" : "Gorduras"} em relação ao plano`}
                                  />
                                )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
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
                        <div className="activity-total-known">
                          <dt>Duração</dt>
                          <dd>{number(activityDuration, 1)} min</dd>
                        </div>
                        {(
                          [
                            ["Distância", "distance_km", "km"],
                            ["Calorias", "kcal", "kcal"],
                          ] as const
                        )
                          .filter(
                            ([, field]) =>
                              field !== "kcal" || preferences.show_calories,
                          )
                          .map(([label, field, unit]) => {
                            const known = activities.filter(
                              (row) => row[field] != null,
                            );
                            return (
                              <div
                                key={field}
                                className={
                                  known.length
                                    ? "activity-total-known"
                                    : "activity-total-unknown"
                                }
                              >
                                <dt>{label}</dt>
                                <dd>
                                  {known.length
                                    ? `${number(
                                        known.reduce(
                                          (sum, row) =>
                                            sum + Number(row[field]),
                                          0,
                                        ),
                                        field === "distance_km" ? 2 : 1,
                                      )} ${unit}`
                                    : field === "distance_km"
                                      ? "Não informada"
                                      : "Não informadas"}
                                  {known.length > 0 &&
                                    known.length < activities.length && (
                                      <small> · Subtotal parcial</small>
                                    )}
                                </dd>
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
                          <ProgressRing
                            value={summary.sessions}
                            max={selected.sessions_goal}
                            label="Sessões registradas em relação à meta semanal"
                          >
                            <strong className="dz-ring-percent">
                              {summary.sessions === null
                                ? "—"
                                : `${number((Number(summary.sessions) / selected.sessions_goal) * 100, 0)}%`}
                            </strong>
                          </ProgressRing>
                        </div>
                      )}
                    {module === "alimentacao" &&
                      diet &&
                      preferences.show_calories && (
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
                    {module === "alimentacao" &&
                      preferences.show_calories &&
                      diet &&
                      diet.totals.kcal.value !== null &&
                      diet.totals.kcal.value > 0 &&
                      summary.kcal !== null &&
                      summary.missing_kcal === 0 &&
                      diet.totals.kcal.missing === 0 && (
                        <ProgressRing
                          value={summary.kcal}
                          max={diet.totals.kcal.value}
                          label="Consumo registrado em relação ao plano alimentar"
                        >
                          <strong>
                            {number(
                              Math.round(
                                (summary.kcal / diet.totals.kcal.value) * 100,
                              ),
                              0,
                            )}
                            %
                          </strong>
                        </ProgressRing>
                      )}
                    {module === "agua" &&
                      summary.water_ml !== null &&
                      summary.water_goal !== null &&
                      summary.water_goal > 0 &&
                      summary.water_ml > 0 && (
                        <svg
                          className="v2-water-wave"
                          viewBox="0 0 160 50"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                          style={{
                            height: `${12 + Math.min(1, summary.water_ml / summary.water_goal) * 36}px`,
                          }}
                        >
                          <path
                            d="M0 18 Q40 0 80 18 T160 18 V50 H0Z"
                            fill="currentColor"
                            fillOpacity=".3"
                          />
                          <path
                            d="M0 10 Q40 35 80 16 T160 10 V50 H0Z"
                            fill="currentColor"
                            fillOpacity=".5"
                          />
                        </svg>
                      )}
                    {module === "agua" &&
                      summary.water_ml !== null &&
                      summary.water_goal !== null && (
                        <ProgressRing
                          value={summary.water_ml}
                          max={summary.water_goal}
                          label="Progresso da meta diária de hidratação"
                        >
                          <strong className="dz-ring-percent">
                            {number(
                              (summary.water_ml / summary.water_goal) * 100,
                              0,
                            )}
                            %
                          </strong>
                        </ProgressRing>
                      )}
                  </Link>
                ))}
            </div>
          </section>
          <QuickActions
            project={selected.id}
            date={date}
            editable={
              selected.status === "ACTIVE" && selected.id === active?.id
            }
          />
          {extra && (
            <DashboardInsights
              project={selected}
              date={date}
              period={period}
              start={rangeStart}
              weights={weights}
              details={extra}
              summary={summary}
              diet={diet}
              showWeight={preferences.show_weight}
              showCalories={preferences.show_calories}
            />
          )}
          <details className="v2-followup">
            <summary>
              Planejamento e acompanhamento do dia{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </summary>
            <DayOverview
              date={date}
              project={selected.id}
              projectName={selected.name}
              plannedWorkouts={plannedWorkouts}
              phase={phase}
              checkin={checkinRecorded}
              available={followupAvailable}
              editable={
                selected.status === "ACTIVE" && selected.id === active?.id
              }
            />
          </details>
          {!sleepAvailable && (
            <p role="status" className="readonly-note">
              O sono está temporariamente indisponível. Seus outros registros
              continuam acessíveis.
            </p>
          )}
          {sleepAvailable && (sleepConfigured || sleepRecord) && (
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
              prefetch={false}
              className="button-secondary"
              href={`/painel/medidas?projeto=${selected.id}`}
            >
              <span className="project-setting-icon" aria-hidden="true">
                <Ruler size={20} />
              </span>
              <span>Medidas corporais</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {preferences.show_photos && (
              <Link
                prefetch={false}
                className="button-secondary"
                href={`/painel/fotos?projeto=${selected.id}`}
              >
                <span className="project-setting-icon" aria-hidden="true">
                  <Camera size={20} />
                </span>
                <span>Fotografias privadas</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
          </nav>
          <OfflineSnapshot
            project={selected.name}
            date={formatDate(date)}
            items={cards
              .filter(
                (card) => card.module !== "peso" || preferences.show_weight,
              )
              .map((card) => ({
                label: card.label,
                value: card.value,
              }))}
          />
        </>
      ) : (
        <div className="content-card">
          <h1>Vamos preparar seu primeiro projeto?</h1>
          <p className="intro">
            Escolha pelo menos uma meta de água, peso ou sessões para começar.
          </p>
          <Link
            prefetch={false}
            className="button-primary"
            href="/painel/projetos"
          >
            Configurar meu primeiro projeto
          </Link>
        </div>
      )}
      <LogoutButton />
    </div>
  );
}
