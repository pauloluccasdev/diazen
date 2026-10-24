import { CalorieBalance } from "@/components/calorie-balance";
import Link from "next/link";
import {
  Droplets,
  Utensils,
  Dumbbell,
  ChartNoAxesCombined,
  Camera,
  Ruler,
  SlidersHorizontal,
  ChevronDown,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { LogoutButton } from "@/components/logout-button";
import { OfflineSnapshot } from "@/components/offline-snapshot";
import { dashboardPlan } from "@/lib/dashboard-plan";
import { projectContext } from "@/lib/data";
import type { Summary } from "@/lib/records";
import { statusLabel, formatDate, today, isDate, number } from "@/lib/domain";
export const metadata = { title: "Seu painel" };
export const dynamic = "force-dynamic";
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string }>;
}) {
  const params = await searchParams,
    { selected, projects, active, client } = await projectContext(
      params.projeto,
    );
  const date =
    params.data && isDate(params.data)
      ? params.data
      : selected?.ends_on && selected.ends_on < today()
        ? selected.ends_on
        : today();
  let summary: Summary | null = null;
  let diet: Awaited<ReturnType<typeof dashboardPlan>> = null;
  if (selected) {
    const [result, comparison] = await Promise.all([
      client.rpc("project_summary", { p_project: selected.id, p_date: date }),
      dashboardPlan(client, selected.id, date),
    ]);
    const { data, error } = result;
    diet = comparison;
    if (error) throw new Error("Falha ao carregar indicadores");
    summary = data as Summary;
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
          empty: summary.sessions === null,
          icon: Dumbbell,
          value:
            summary.sessions === null
              ? "Sem sessões registradas"
              : `${summary.sessions} sessões na semana`,
          detail:
            selected?.sessions_goal === null
              ? "Meta não configurada"
              : `Meta geral: ${selected?.sessions_goal} sessões/semana`,
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
      {selected && summary ? (
        <>
          <details className="dashboard-query">
            <summary>
              <span className="project-setting-icon" aria-hidden="true">
                <SlidersHorizontal size={20} />
              </span>
              <span className="project-setting-title">
                Alterar projeto ou data da consulta
              </span>
              <ChevronDown
                className="project-setting-chevron"
                size={18}
                aria-hidden="true"
              />
            </summary>
            <form className="filter-form dashboard-filters">
              <label>
                Projeto visualizado
                <select name="projeto" defaultValue={selected.id}>
                  {!projects.some((p) => p.id === selected.id) && (
                    <option value={selected.id}>{selected.name}</option>
                  )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {statusLabel[p.status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data da consulta
                <input
                  type="date"
                  name="data"
                  defaultValue={date}
                  max={today()}
                />
              </label>
              <button className="button-primary">Consultar</button>
            </form>
          </details>
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
                    <dt>Refeições do plano registradas</dt>
                    <dd>{diet.registeredMeals.length}</dd>
                  </div>
                </dl>
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
