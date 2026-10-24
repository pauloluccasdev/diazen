"use client";
import { useState, useTransition, useSyncExternalStore, useRef } from "react";
import {
  FileText,
  PencilLine,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react";
import { ActionDisclosure } from "./action-disclosure";
import { useOnline } from "@/lib/use-online";
import { readDietPdf, DietPdfError } from "@/lib/read-diet-pdf";
import {
  emptyComposition,
  analyzeDietPlan,
  analyzePlanFood,
  applyPlanReference,
  applyOnlinePlanReference,
  foodComposition,
  planTotals,
  planNutrients,
  type DietPlan,
  type PlanFood,
} from "@/lib/diet-plan";
import {
  searchTacoFoods,
  tacoSource,
  suggestTacoFoods,
  tacoName,
} from "@/lib/taco";
import { nutrients } from "@/lib/records";
import { number } from "@/lib/domain";
import { saveDietPlan } from "@/app/painel/plano/actions";
import { PlanSavedDialog } from "./plan-saved-dialog";
import { OnlineFoodSearch } from "./online-food-search";

const subscribeReady = () => () => {};
function FoodReview({
  food,
  onChange: applyChange,
  disabled,
  onApplyReference,
}: {
  food: PlanFood;
  onChange: (food: PlanFood) => void;
  disabled: boolean;
  onApplyReference?: () => void;
}) {
  function onChange(next: PlanFood) {
    applyChange(
      next.amount !== null &&
        (next.amount !== food.amount ||
          next.unit !== food.unit ||
          next.name !== food.name)
        ? analyzePlanFood(next)
        : next,
    );
  }
  const [search, setSearch] = useState<string | null>(null);
  const query = search ?? (food.tacoId === null ? tacoName(food.name) : "");
  const candidates =
    search === null
      ? suggestTacoFoods(food.name)
      : searchTacoFoods(tacoName(query), 5);
  const values = foodComposition(food);
  return (
    <ActionDisclosure
      title={
        values.kcal === null
          ? "Completar dados nutricionais"
          : "Revisar dados nutricionais"
      }
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
            onChange={(e) =>
              onChange({
                ...food,
                name: e.target.value,
                tacoId: null,
                source: "",
                values: emptyComposition(),
              })
            }
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
            value={query}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {query.length >= 2 && (
          <div className="plan-search-results">
            {candidates.map((t) => (
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
            {!candidates.length && (
              <p>
                Sem correspondência na TACO. Você pode revisar a referência
                online ou informar os valores abaixo.
              </p>
            )}
          </div>
        )}
        {food.tacoId !== null && (
          <>
            <p>Referência identificada: {food.source}</p>
            {onApplyReference && (
              <button
                type="button"
                className="button-secondary"
                disabled={disabled}
                onClick={onApplyReference}
              >
                Aplicar aos itens pendentes com este nome
              </button>
            )}
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
        <>
          <p className="intro">
            {food.tacoId !== null
              ? "Valores calculados pela TACO para a porção acima. Confira o alimento e o preparo identificados."
              : "Valores para a porção acima. Ao alterar a quantidade, informe novamente a composição dessa porção."}
          </p>
          <label>
            Fonte dos valores
            <input
              value={food.source}
              readOnly={food.tacoId !== null}
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
                value={
                  (food.tacoId !== null ? values[k] : food.values[k]) ?? ""
                }
                readOnly={food.tacoId !== null}
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
  const [plan, setPlan] = useState<DietPlan | null>(() =>
      initial && editable ? analyzeDietPlan(initial) : initial,
    ),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false),
    [serverReading, setServerReading] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [requestId, setRequestId] = useState("");
  const successRef = useRef<HTMLParagraphElement>(null);
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
      <PlanSavedDialog
        open={saved}
        onClose={() => {
          setSaved(false);
          successRef.current?.focus();
        }}
      />
      {editable && (
        <details className="content-card plan-import" open={!plan}>
          <summary>
            <h2>
              {plan
                ? "Importar outra versão do plano"
                : "Importar plano em PDF"}
            </h2>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>
          <div className="plan-import-body">
            <div className="plan-import-copy">
              <p className="intro">
                Até 3 MB e 30 páginas, com texto selecionável.
              </p>
              <p className="intro">
                A leitura começa neste navegador. Se ela falhar, o Diazen tenta
                uma leitura temporária no servidor, sem armazenar o PDF nem
                enviá-lo a serviços externos.
              </p>
              <p className="intro">
                Revise os alimentos e as opções antes de salvar os dados.
              </p>
            </div>
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
                  setServerReading(false);
                  setError("");
                  setMessage("");
                  try {
                    const next = await readDietPdf(file, () =>
                      setServerReading(true),
                    );
                    update(next);
                  } catch (cause) {
                    setError(
                      cause instanceof DietPdfError
                        ? cause.message
                        : "Não foi possível acessar o arquivo. Selecione novamente o PDF e tente outra vez.",
                    );
                  } finally {
                    setReading(false);
                  }
                }}
              />
            </label>
            {reading && (
              <p role="status">
                {serverReading
                  ? "Lendo o PDF temporariamente no servidor…"
                  : "Lendo as refeições do PDF…"}
              </p>
            )}
          </div>
        </details>
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
      {message && (
        <p role="status" tabIndex={-1} ref={successRef}>
          {message}
        </p>
      )}
      {plan && totals && (
        <>
          <section className="content-card">
            <h2>Plano e consumo registrado</h2>
            <p className="intro">
              A TACO e as referências padrão preenchem os alimentos conhecidos.
              Para os demais, buscamos automaticamente uma composição online.
              Preparos, marcas e porções estimadas ficam identificados e podem
              ser editados. Apenas o nome do alimento é enviado à fonte
              colaborativa (
              <a
                href="https://opendatacommons.org/licenses/odbl/1-0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ODbL
              </a>
              ).
            </p>
            {editable && (
              <button
                type="button"
                className="button-secondary"
                disabled={disabled}
                onClick={() => update(analyzeDietPlan(plan))}
              >
                Completar itens pendentes
              </button>
            )}
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
            {plan.meals.some(
              (meal) =>
                meal.enabled &&
                meal.groups.some(
                  (group) =>
                    group.included &&
                    group.choices[group.selected].source.startsWith(
                      "Referência padrão",
                    ),
                ),
            ) && (
              <p className="intro">
                Os totais incluem referências padrão e podem variar conforme a
                marca, o preparo e a porção estimada.
              </p>
            )}
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
            <details
              className="content-card plan-meal"
              key={`${meal.name}-${meal.option}`}
              open
            >
              <summary>
                <h2>
                  {meal.name}
                  {plan.meals.filter((m) => m.name === meal.name).length > 1
                    ? ` · opção ${meal.option}`
                    : ""}
                </h2>
                <span className="plan-meal-summary">
                  {!meal.enabled ? "Fora do cálculo · " : ""}
                  {(() => {
                    const total = planTotals([{ ...meal, enabled: true }]).kcal;
                    return total.value === null
                      ? "Calculando calorias"
                      : `${number(total.value)} kcal${total.missing ? " · parcial" : ""}`;
                  })()}
                </span>
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
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
                      <article
                        className="plan-food"
                        key={gi}
                        aria-label={food.name}
                      >
                        <div className="plan-food-header">
                          <div>
                            <h3>{food.name}</h3>
                            <p className="muted">
                              {food.amount !== null && food.unit
                                ? `${number(food.amount, 3)} ${food.unit}`
                                : food.original}
                            </p>
                          </div>
                          <strong
                            className={
                              group.included &&
                              foodComposition(food).kcal === null
                                ? "plan-food-pending"
                                : ""
                            }
                          >
                            {!group.included
                              ? "Fora do cálculo"
                              : foodComposition(food).kcal === null
                                ? "Completar dados"
                                : `${food.source.startsWith("Referência padrão") ? "≈ " : ""}${number(foodComposition(food).kcal!)} kcal`}
                          </strong>
                        </div>
                        {food.source.startsWith("Referência padrão") && (
                          <p className="plan-food-source">
                            {food.source.split(";")[0]}. Você pode editar os
                            valores.
                            {food.source.includes("porção estimada") && (
                              <span>
                                {" "}
                                Porção de referência estimada: {food.amount} g.
                              </span>
                            )}
                            {food.source.match(/https:\/\/\S+/)?.[0] && (
                              <a
                                href={food.source.match(/https:\/\/\S+/)![0]}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {" "}
                                Conferir fonte
                              </a>
                            )}
                          </p>
                        )}
                        {group.included &&
                          food.tacoId === null &&
                          !food.source &&
                          planNutrients.every(
                            (k) => food.values[k] === null,
                          ) && (
                            <OnlineFoodSearch
                              name={food.name}
                              amount={food.amount}
                              unit={food.unit}
                              disabled={disabled}
                              onUse={(reference) => {
                                setPlan((current) =>
                                  current
                                    ? applyOnlinePlanReference(
                                        current,
                                        food,
                                        reference,
                                      )
                                    : current,
                                );
                                setReviewed(false);
                                setRequestId("");
                              }}
                            />
                          )}
                        {group.included && (
                          <FoodReview
                            key={group.selected}
                            food={food}
                            disabled={disabled}
                            onApplyReference={
                              plan.meals.some((m) =>
                                m.groups.some((g) =>
                                  g.choices.some(
                                    (f) =>
                                      f.tacoId === null &&
                                      !f.source &&
                                      tacoName(f.name) ===
                                        tacoName(food.name) &&
                                      planNutrients.every(
                                        (k) => f.values[k] === null,
                                      ),
                                  ),
                                ),
                              )
                                ? () => {
                                    if (food.tacoId !== null)
                                      update(
                                        applyPlanReference(
                                          plan,
                                          food.name,
                                          food.tacoId,
                                        ),
                                      );
                                  }
                                : undefined
                            }
                            onChange={(next) =>
                              patchGroup({
                                choices: group.choices.map((f, i) =>
                                  i === group.selected ? next : f,
                                ),
                              })
                            }
                          />
                        )}
                        {group.included && group.choices.length > 1 && (
                          <ActionDisclosure
                            title="Trocar alimento"
                            icon={ArrowLeftRight}
                          >
                            <label>
                              Escolher alimento ou substituição
                              <select
                                value={group.selected}
                                disabled={disabled}
                                onChange={(e) =>
                                  patchGroup({
                                    selected: Number(e.target.value),
                                  })
                                }
                              >
                                {group.choices.map((choice, index) => (
                                  <option key={index} value={index}>
                                    {choice.name}
                                    {choice.amount !== null && choice.unit
                                      ? ` · ${number(choice.amount, 3)} ${choice.unit}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </ActionDisclosure>
                        )}
                        <button
                          type="button"
                          className="button-secondary plan-food-toggle"
                          disabled={disabled}
                          onClick={() =>
                            patchGroup({ included: !group.included })
                          }
                        >
                          {group.included
                            ? "Retirar desta refeição"
                            : "Incluir nesta refeição"}
                        </button>
                      </article>
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
            </details>
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
                        setSaved(true);
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
