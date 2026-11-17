import { DisclosureLink } from "@/components/disclosure-link";
import "./food.css";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  FileUp,
  History,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ModuleHeading } from "@/components/shell/module-heading";
import { ModuleContext } from "@/components/shell/module-context";
import { ManualMealRecorder } from "@/components/manual-meal-recorder";
import { PlanMealRecorder } from "@/components/plan-meal-recorder";
import { FoodConveniences } from "@/components/food-conveniences";
import { ClearOfflineData } from "@/components/offline-snapshot";
import { type Project, formatDate, number, today } from "@/lib/domain";
import { categories, type Entry, type Summary } from "@/lib/records";
import type { dashboardPlan } from "@/lib/dashboard-plan";
import { FoodSummary } from "./food-summary";
import { FoodGroups } from "./food-groups";

type Diet = Awaited<ReturnType<typeof dashboardPlan>>;
export function FoodDiary({
  client,
  projects,
  selected,
  active,
  date,
  summary,
  diet,
  page,
  rows,
  allRows,
  hasMore,
  filters,
  renderRecord,
}: {
  client: SupabaseClient;
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  summary: Summary;
  diet: Diet;
  page: number;
  rows: Entry[];
  allRows: Entry[];
  hasMore: boolean;
  filters: {
    registrar?: string;
    refeicao?: string;
    refeicao_excluida?: string;
  };
  renderRecord: (row: Entry) => ReactNode;
}) {
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const category =
    filters.refeicao && Object.hasOwn(categories, filters.refeicao)
      ? (filters.refeicao as keyof typeof categories)
      : undefined;
  const base = `/painel/alimentacao?${new URLSearchParams({ projeto: selected.id, data: date })}`;
  const max =
    selected.ends_on && selected.ends_on < today() ? selected.ends_on : today();
  return (
    <div className="module-page module-alimentacao">
      <ModuleContext
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path="/painel/alimentacao"
      />
      <ModuleHeading
        key={`${selected.id}-${date}`}
        title="Alimentação"
        description="Registre suas refeições e acompanhe seu consumo nutricional diário."
        project={{ id: selected.id, name: selected.name }}
        date={date}
        path="/painel/alimentacao"
        action={
          <Link
            className="button-secondary"
            href={`/painel/plano?projeto=${selected.id}&data=${date}`}
          >
            <CalendarDays size={19} aria-hidden="true" />
            Planejamento diário
          </Link>
        }
      />
      {!editable && (
        <p className="readonly-note">
          {selected.status === "DRAFT"
            ? "Rascunhos não recebem registros."
            : "Histórico somente leitura."}{" "}
          {active && (
            <Link href={`/painel/alimentacao?projeto=${active.id}`}>
              Registrar no projeto ativo “{active.name}” →
            </Link>
          )}
        </p>
      )}
      <FoodSummary
        summary={summary}
        diet={diet}
        date={date}
        project={selected.id}
      />
      {filters.refeicao_excluida === "1" && (
        <>
          <ClearOfflineData />
          <p role="status" className="form-success">
            Refeição excluída. Todos os alimentos desse grupo foram removidos
            dos registros da data.
          </p>
        </>
      )}
      <section
        id="registros-do-dia"
        className="records-section"
        aria-label="Histórico de registros"
      >
        <div className="food-list-heading">
          <h2>
            Refeições do dia <span>(6)</span>
          </h2>
          <span className="food-list-total">
            Total:{" "}
            <strong>
              {summary.kcal === null
                ? "Não informado"
                : `${number(summary.kcal)} kcal`}
            </strong>
            {summary.kcal !== null && summary.missing_kcal > 0 && " (parcial)"}
          </span>
          {editable && (
            <DisclosureLink
              targetId="novo-registro"
              className="button-primary food-desktop-add"
              href={`${base}&registrar=1#novo-registro`}
            >
              <Plus size={20} aria-hidden="true" />
              Adicionar alimento
            </DisclosureLink>
          )}
        </div>
        <p className="sr-only">
          {summary.food_count} alimentos neste dia. Abra uma refeição para
          conferir a composição e os registros.
        </p>
        <FoodGroups
          allRows={allRows}
          rows={rows}
          project={selected.id}
          date={date}
          page={page}
          editable={editable}
          selectedCategory={category}
          renderRecord={renderRecord}
        />
      </section>
      <nav className="panel-nav" aria-label="Paginação">
        {page > 1 && (
          <Link href={`${base}&pagina=${page - 1}`}>Anteriores</Link>
        )}
        {hasMore && <Link href={`${base}&pagina=${page + 1}`}>Próximos</Link>}
      </nav>
      {editable && (
        <ManualMealRecorder
          key={`${date}-${category ?? "breakfast"}`}
          initiallyOpen={filters.registrar === "1"}
          initialCategory={category}
          date={date}
          min={selected.starts_on}
          max={max}
        />
      )}
      <FoodConveniences
        client={client}
        project={selected.id}
        date={date}
        activeName={active?.name}
        activeProject={active?.id}
      />
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
      {diet && (
        <section className="planned-meals" aria-label="Refeições do plano">
          <h2>Suas refeições planejadas</h2>
          <p className="intro">
            Data consultada: {formatDate(date)}. Abra uma refeição do plano para
            registrar o que consumiu ou ajustar as porções. Para incluir outros
            alimentos, use “Adicionar alimento”. Esses ajustes alteram apenas
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
                  max={max}
                  registered={diet.registeredMeals.includes(index)}
                  actual={diet.mealActuals[index]}
                  editable={editable}
                />
              ),
          )}
        </section>
      )}
      <Link
        className="button-secondary meal-record-link"
        href="/painel/historico"
      >
        <History size={20} aria-hidden="true" />
        <span>Consultar histórico geral</span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
