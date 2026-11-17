import Link from "next/link";
import { Target } from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";
import { formatDate, number } from "@/lib/domain";
import { nutrients, type Nutrient, type Summary } from "@/lib/records";
import type { dashboardPlan } from "@/lib/dashboard-plan";

type Diet = Awaited<ReturnType<typeof dashboardPlan>>;
export function FoodSummary({
  summary,
  diet,
  date,
  project,
}: {
  summary: Summary;
  diet: Diet;
  date: string;
  project: string;
}) {
  const goal = diet?.totals.kcal;
  const comparable =
    summary.kcal !== null &&
    summary.missing_kcal === 0 &&
    goal?.value != null &&
    goal.value > 0 &&
    goal.missing === 0;
  const percent = comparable
    ? Math.round((summary.kcal! / goal!.value!) * 100)
    : null;
  return (
    <>
      <div className="food-nutrition-overview">
        <section
          className="content-card food-nutrition-summary nutrition-grid"
          aria-labelledby="nutrition-day-title"
        >
          <h2 id="nutrition-day-title" className="sr-only">
            Totais de {formatDate(date)}
          </h2>
          <div
            className={`food-energy${summary.kcal === null ? " food-energy-unknown" : ""}`}
          >
            <ProgressRing
              value={comparable ? summary.kcal : null}
              max={comparable ? goal!.value : null}
              label="Consumo registrado em relação ao plano alimentar"
            >
              <span className="food-energy-value">
                <strong>
                  {summary.kcal === null ? (
                    "Não informado"
                  ) : (
                    <>
                      {number(summary.kcal)}
                      <span className="food-calorie-unit"> kcal</span>
                    </>
                  )}
                </strong>
                <span>
                  {goal?.value != null && goal.missing === 0
                    ? `de ${number(goal.value)} kcal`
                    : "Sem referência no plano"}
                </span>
              </span>
              <span className="food-energy-percent">
                {percent === null ? "—" : `${percent}%`}
              </span>
            </ProgressRing>
            {summary.kcal !== null && summary.missing_kcal > 0 && (
              <small className="food-partial">
                Subtotal parcial · {summary.missing_kcal} sem valor
              </small>
            )}
          </div>
          <dl className="food-macro-goals">
            {(["protein", "carbs", "fat"] as Nutrient[]).map((key) => {
              const value = summary[key],
                missing = Number(summary[`missing_${key}`]),
                reference = diet?.totals[key];
              const valid =
                value !== null &&
                missing === 0 &&
                reference?.value != null &&
                reference.value > 0 &&
                reference.missing === 0;
              return (
                <div
                  className={`food-macro food-macro-${key}${value === null ? " food-macro-empty" : ""}`}
                  key={key}
                >
                  <dt>{nutrients[key]}</dt>
                  <dd>
                    <strong>
                      {value === null ? "Não informado" : `${number(value)} g`}
                    </strong>
                    {reference?.value != null && reference.missing === 0 && (
                      <span className="food-macro-reference">
                        {value === null ? "Plano: " : " / "}
                        {number(reference.value)} g
                      </span>
                    )}
                    {valid ? (
                      <progress
                        value={value}
                        max={reference!.value!}
                        aria-label={`${nutrients[key]} em relação ao plano`}
                      />
                    ) : (
                      <span className="food-macro-track" aria-hidden="true" />
                    )}
                    {value !== null && missing > 0 && (
                      <small>Subtotal parcial · {missing} sem valor</small>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p
            className="food-diary-state"
            title="O status descreve os registros vinculados ao plano; não confirma aderência alimentar."
          >
            {diet?.complete
              ? "Todas as refeições do plano têm registros."
              : Number(summary.food_count) > 0
                ? diet
                  ? "Plano parcialmente registrado."
                  : `${summary.food_count} alimentos registrados · Sem plano para comparar.`
                : "Sem registros neste dia."}
          </p>
        </section>
        <Link
          className="food-goal-card"
          href={`/painel/plano?projeto=${project}&data=${date}`}
        >
          <Target size={32} aria-hidden="true" />
          <span>
            <span>Referência do plano</span>
            <strong>
              {goal?.value != null && goal.missing === 0
                ? `${number(goal.value)} kcal`
                : "Consultar plano"}
            </strong>
          </span>
          {diet && (
            <span className="food-goal-macros">
              {(["protein", "carbs", "fat"] as const).map((key, index) => (
                <span key={key}>
                  {["P", "C", "G"][index]}:{" "}
                  {diet.totals[key].value === null ||
                  diet.totals[key].missing > 0
                    ? "—"
                    : `${number(diet.totals[key].value!)} g`}
                </span>
              ))}
            </span>
          )}
        </Link>
      </div>
    </>
  );
}
