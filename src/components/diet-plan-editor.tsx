"use client";
import { useState, useTransition, useSyncExternalStore } from "react";
import { FileText, PencilLine } from "lucide-react";
import { ActionDisclosure } from "./action-disclosure";
import { useOnline } from "@/lib/use-online";
import { readDietPdf } from "@/lib/read-diet-pdf";
import {
  emptyComposition,
  foodComposition,
  planTotals,
  planNutrients,
  type DietPlan,
  type PlanFood,
} from "@/lib/diet-plan";
import { searchTacoFoods, tacoSource } from "@/lib/taco";
import { nutrients } from "@/lib/records";
import { number } from "@/lib/domain";
import { saveDietPlan } from "@/app/painel/plano/actions";
const subscribeReady = () => () => {};
function FoodReview({
  food,
  onChange,
  disabled,
}: {
  food: PlanFood;
  onChange: (food: PlanFood) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const values = foodComposition(food);
  return (
    <ActionDisclosure
      title={`${food.name} · ${values.kcal === null ? "calorias pendentes" : `${number(values.kcal)} kcal`}`}
      icon={PencilLine}
    >
      <div className="data-form">
        <p className="intro">
          PDF, página {food.page}: {food.original}. Confira o alimento e o
          preparo.
        </p>
        <label>
          Nome do alimento
          <input
            value={food.name}
            maxLength={200}
            disabled={disabled}
            onChange={(e) => onChange({ ...food, name: e.target.value })}
          />
        </label>
        <label>
          Quantidade da porção
          <input
            type="number"
            min="0.001"
            max="100000"
            step="0.001"
            value={food.amount ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...food,
                amount: e.target.value ? Number(e.target.value) : null,
                values: emptyComposition(),
                source: food.tacoId ? food.source : "",
              })
            }
          />
        </label>
        <label>
          Unidade da porção
          <select
            value={food.unit ?? ""}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...food,
                unit: e.target.value as PlanFood["unit"],
                values: emptyComposition(),
                source: food.tacoId ? food.source : "",
              })
            }
          >
            <option value="" disabled>
              Não identificada
            </option>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
        </label>
        <label>
          Buscar correspondência na TACO
          <input
            value={search}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {search.length >= 2 && (
          <div className="plan-search-results">
            {searchTacoFoods(search, 5).map((t) => (
              <button
                key={t.id}
                type="button"
                className="button-secondary"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    ...food,
                    tacoId: t.id,
                    source: tacoSource(t),
                    values: emptyComposition(),
                  });
                  setSearch("");
                }}
              >
                {t.name} · item {t.id}
              </button>
            ))}
            {!searchTacoFoods(search, 5).length && (
              <p>
                Nenhum alimento encontrado. Use os valores do rótulo com a fonte
                identificada.
              </p>
            )}
          </div>
        )}
        {food.tacoId !== null && (
          <>
            <p>{food.source}</p>
            {food.unit !== "g" && (
              <p className="form-error">
                A TACO exige a porção em gramas. Informe o peso medido; ml não é
                convertido automaticamente.
              </p>
            )}
            <button
              type="button"
              className="button-secondary"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...food,
                  tacoId: null,
                  source: "",
                  values: emptyComposition(),
                })
              }
            >
              Usar valores informados
            </button>
          </>
        )}
        {food.tacoId === null && (
          <>
            <p className="intro">
              Valores para a porção acima. Ao alterar a quantidade, informe
              novamente a composição dessa porção.
            </p>
            <label>
              Fonte dos valores
              <input
                value={food.source}
                maxLength={300}
                disabled={disabled}
                onChange={(e) => onChange({ ...food, source: e.target.value })}
              />
            </label>
            {planNutrients.map((k) => (
              <label key={k}>
                {nutrients[k]} ({k === "kcal" ? "kcal" : "g"})
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="0.001"
                  value={food.values[k] ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({
                      ...food,
                      values: {
                        ...food.values,
                        [k]:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </>
        )}
        <p className="intro">
          {planNutrients
            .map(
              (k) =>
                `${nutrients[k]}: ${values[k] === null ? "não informado" : `${number(values[k]!)} ${k === "kcal" ? "kcal" : "g"}`}`,
            )
            .join(" · ")}
        </p>
      </div>
    </ActionDisclosure>
  );
}
export function DietPlanEditor({
  project,
  initial,
  editable,
  consumed,
}: {
  project: string;
  initial: DietPlan | null;
  editable: boolean;
  consumed: { kcal: number | null; missing: number; date: string };
}) {
  const [plan, setPlan] = useState<DietPlan | null>(initial),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [requestId, setRequestId] = useState("");
  const [pending, startTransition] = useTransition();
  const online = useOnline();
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const disabled = !ready || !editable || !online || pending || reading;
  const totals = plan ? planTotals(plan.meals) : null;
  function update(next: DietPlan) {
    setPlan(next);
    setReviewed(false);
    setRequestId("");
    setMessage("");
  }
  return (
    <div className="plan-workspace">
      {editable && (
        <section className="content-card">
          <h2>Importar plano em PDF</h2>
          <p className="intro">
            Até 3 MB e 30 páginas, com texto selecionável. A leitura acontece
            neste navegador; o PDF original não é armazenado nem enviado a
            terceiros. Revise os alimentos e as opções antes de salvar os dados.
          </p>
          <label className="plan-file">
            <span className="button-secondary">Selecionar PDF</span>
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              disabled={disabled}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (
                  plan &&
                  !window.confirm(
                    "Substituir a revisão em tela pelo novo PDF? As versões já salvas permanecem preservadas.",
                  )
                )
                  return;
                setReading(true);
                setError("");
                setMessage("");
                try {
                  const next = await readDietPdf(file);
                  update(next);
                } catch (cause) {
                  setError(
                    cause instanceof Error &&
                      cause.message.startsWith("Não reconhecemos")
                      ? cause.message
                      : "Não foi possível ler. Use PDF sem senha, com texto selecionável, até 3 MB e 30 páginas. Formatos com tabelas diferentes podem não ser reconhecidos.",
                  );
                } finally {
                  setReading(false);
                }
              }}
            />
          </label>
          {reading && <p role="status">Lendo as refeições do PDF…</p>}
        </section>
      )}
      {!online && (
        <p className="readonly-note">
          Sem conexão. A importação e o salvamento estão bloqueados.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {plan && totals && (
        <>
          <section className="content-card">
            <h2>Plano e consumo registrado</h2>
            <div className="nutrition-grid">
              {planNutrients.map((k) => (
                <div key={k}>
                  <span className="muted">{nutrients[k]} do plano</span>
                  <strong>
                    {totals[k].value === null
                      ? "Pendente"
                      : `${number(totals[k].value!)} ${k === "kcal" ? "kcal" : "g"}`}
                  </strong>
                  {totals[k].missing > 0 && (
                    <span className="muted">
                      Subtotal parcial · {totals[k].missing} sem valor
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p>
              Consumo registrado em {consumed.date}:{" "}
              {consumed.kcal === null
                ? "não informado"
                : `${number(consumed.kcal)} kcal`}
              {consumed.missing > 0 ? " · parcial" : ""}.
            </p>
            <p className="intro">
              Comparação descritiva. O plano não confirma consumo nem aderência.
              As substituições entram no cálculo somente quando selecionadas;
              inclua o pré-treino apenas no cenário desejado.
            </p>
          </section>
          <label className="plan-title data-form">
            Nome do plano
            <input
              value={plan.title}
              maxLength={120}
              disabled={disabled}
              onChange={(e) => update({ ...plan, title: e.target.value })}
            />
          </label>
          {plan.meals.map((meal, mi) => (
            <section
              className="content-card"
              key={`${meal.name}-${meal.option}`}
            >
              <h2>
                {meal.name}
                {plan.meals.filter((m) => m.name === meal.name).length > 1
                  ? ` · opção ${meal.option}`
                  : ""}
              </h2>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={meal.enabled}
                  disabled={disabled}
                  onChange={(e) =>
                    update({
                      ...plan,
                      meals: plan.meals.map((m, i) =>
                        i === mi
                          ? { ...m, enabled: e.target.checked }
                          : e.target.checked && m.name === meal.name
                            ? { ...m, enabled: false }
                            : m,
                      ),
                    })
                  }
                />
                Incluir esta opção no cálculo
                {meal.conditional ? " (condicional)" : ""}
              </label>
              {meal.enabled && (
                <>
                  <p className="intro">
                    {(() => {
                      const total = planTotals([meal]).kcal;
                      return total.value === null
                        ? "Calorias pendentes"
                        : `${number(total.value)} kcal${total.missing ? " · subtotal parcial" : ""}`;
                    })()}
                  </p>
                  {meal.groups.map((group, gi) => {
                    const food = group.choices[group.selected];
                    const patchGroup = (change: Partial<typeof group>) =>
                      update({
                        ...plan,
                        meals: plan.meals.map((m, i) =>
                          i !== mi
                            ? m
                            : {
                                ...m,
                                groups: m.groups.map((g, j) =>
                                  j === gi ? { ...g, ...change } : g,
                                ),
                              },
                        ),
                      });
                    return (
                      <div className="plan-food" key={gi}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={group.included}
                            disabled={disabled}
                            onChange={(e) =>
                              patchGroup({ included: e.target.checked })
                            }
                          />
                          {food.optional
                            ? "Incluir alimento opcional"
                            : "Incluir alimento"}
                          : {food.name}
                        </label>
                        {group.choices.length > 1 && (
                          <label>
                            Alimento ou substituição
                            <select
                              value={group.selected}
                              disabled={disabled}
                              onChange={(e) =>
                                patchGroup({ selected: Number(e.target.value) })
                              }
                            >
                              {group.choices.map((f, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? "Base: " : "Substituição: "}
                                  {f.name} · {f.original}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {group.included && (
                          <FoodReview
                            food={food}
                            disabled={disabled}
                            onChange={(next) =>
                              patchGroup({
                                choices: group.choices.map((f, i) =>
                                  i === group.selected ? next : f,
                                ),
                              })
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                  {editable && (
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={disabled || meal.groups.length >= 100}
                      onClick={() =>
                        update({
                          ...plan,
                          meals: plan.meals.map((m, i) =>
                            i === mi
                              ? {
                                  ...m,
                                  groups: [
                                    ...m.groups,
                                    {
                                      selected: 0,
                                      included: true,
                                      choices: [
                                        {
                                          name: "Alimento a revisar",
                                          amount: null,
                                          unit: null,
                                          original:
                                            "Incluído na revisão pelo usuário",
                                          page: 1,
                                          optional: false,
                                          tacoId: null,
                                          source: "",
                                          values: emptyComposition(),
                                        },
                                      ],
                                    },
                                  ],
                                }
                              : m,
                          ),
                        })
                      }
                    >
                      Adicionar alimento à revisão
                    </button>
                  )}
                </>
              )}
            </section>
          ))}
          {editable && (
            <button
              type="button"
              className="button-secondary"
              disabled={disabled || plan.meals.length >= 30}
              onClick={() =>
                update({
                  ...plan,
                  meals: [
                    ...plan.meals,
                    {
                      name: `Refeição adicional ${plan.meals.length + 1}`,
                      option: 1,
                      conditional: false,
                      enabled: true,
                      groups: [
                        {
                          selected: 0,
                          included: true,
                          choices: [
                            {
                              name: "Alimento a revisar",
                              amount: null,
                              unit: null,
                              original: "Incluído na revisão pelo usuário",
                              page: 1,
                              optional: false,
                              tacoId: null,
                              source: "",
                              values: emptyComposition(),
                            },
                          ],
                        },
                      ],
                    },
                  ],
                })
              }
            >
              Adicionar refeição à revisão
            </button>
          )}
          {editable && (
            <section className="content-card data-form">
              <p className="intro">
                Confira todas as linhas com o PDF. Itens sem fonte, porção exata
                ou composição permanecem pendentes; você pode salvar um plano
                parcial e completar em nova versão.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={disabled}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Revisei a extração, os alimentos, as porções e as opções
                incluídas.
              </label>
              <button
                type="button"
                className="button-primary"
                disabled={disabled || !reviewed || !plan.title.trim()}
                onClick={() => {
                  setError("");
                  const id = requestId || crypto.randomUUID();
                  setRequestId(id);
                  startTransition(async () => {
                    try {
                      const result = await saveDietPlan(project, id, plan);
                      if (result.error) setError(result.error);
                      else {
                        setMessage(result.message!);
                        setReviewed(false);
                        setRequestId("");
                      }
                    } catch {
                      setError(
                        "Não foi possível confirmar. Confira as versões salvas antes de tentar novamente.",
                      );
                    }
                  });
                }}
              >
                <FileText size={20} aria-hidden="true" />
                {pending ? "Salvando…" : "Salvar versão do plano"}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
