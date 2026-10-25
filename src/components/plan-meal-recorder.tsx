"use client";
import { ChevronDown, ArrowRight, ClipboardList } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { PlanMeal } from "@/lib/diet-plan";
import {
  mealFoods,
  changedPortion,
  mealComposition,
  type MealFood,
} from "@/lib/meal-registration";
import { registerMeal } from "@/app/painel/plano/registrar";
import { categories } from "@/lib/records";
import { number } from "@/lib/domain";
import { useOnline } from "@/lib/use-online";
export function PlanMealRecorder({
  plan,
  index,
  meal,
  date,
  registered,
  editable,
  actual,
}: {
  plan: string;
  index: number;
  meal: PlanMeal;
  date: string;
  min: string;
  max: string;
  registered: boolean;
  editable: boolean;
  actual?: { value: number | null; missing: number };
}) {
  const initial = mealFoods(meal).map((food) => ({
      ...food,
      unit: food.unit ?? ("g" as const),
    })),
    [foods, setFoods] = useState<MealFood[]>(initial),
    [editing, setEditing] = useState(false),
    [category, setCategory] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const request = useRef(""),
    feedback = useRef<HTMLParagraphElement>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnline();
  const shownFoods = registered ? initial : foods;
  const calories = shownFoods.map((f) => mealComposition(f).kcal),
    known = calories.filter((v): v is number => v !== null),
    total = known.length ? known.reduce((a, b) => a + b, 0) : null;
  const done = registered;
  return (
    <details className="content-card planned-meal" aria-label={meal.name}>
      <summary className="planned-meal-summary">
        <span>
          <strong>{meal.name}</strong>
          <small>
            {registered ? "Registrada" : "Ainda não registrada"} ·{" "}
            {total === null
              ? "Calorias pendentes"
              : `${number(total)} kcal planejadas`}
          </small>
        </span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="planned-meal-body">
        <p className="meal-total">
          {editing && !registered ? "Consumo informado: " : "Planejado: "}
          {total === null ? "Calorias pendentes" : `${number(total)} kcal`}
          {calories.some((v) => v === null) ? " · parcial" : ""}
        </p>
        <ul className="planned-meal-foods">
          {shownFoods.map((food, fi) => (
            <li key={fi}>
              <span>{food.name}</span>
              {editing && !done ? (
                <label>
                  Porção de {food.name} ({food.unit ?? "g"})
                  <input
                    type="number"
                    min="0.001"
                    max="100000"
                    step="0.001"
                    value={food.amount ?? ""}
                    disabled={pending || !online}
                    onChange={(e) => {
                      setFoods(
                        foods.map((f, i) =>
                          i === fi
                            ? changedPortion(
                                initial[fi],
                                e.target.value ? Number(e.target.value) : null,
                              )
                            : f,
                        ),
                      );
                      request.current = "";
                    }}
                  />
                </label>
              ) : (
                <span>
                  {food.amount === null
                    ? "Informe a porção"
                    : `${number(food.amount, 3)} ${food.unit ?? ""}`}
                </span>
              )}
            </li>
          ))}
        </ul>
        {done ? (
          <>
            <p className="meal-total">
              Registrado:{" "}
              {actual?.value === null || actual?.value === undefined
                ? "calorias não informadas"
                : `${number(actual.value)} kcal`}
              {actual?.missing ? " · parcial" : ""}
            </p>
            <p role="status" ref={feedback} tabIndex={-1}>
              {message || "Refeição já registrada nesta data."}
            </p>
            <a
              className="button-secondary meal-record-link"
              href="#registros-do-dia"
            >
              <ClipboardList size={20} aria-hidden="true" />
              <span>Ver e editar registros</span>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </>
        ) : editable ? (
          <form
            className="data-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending || !online) return;
              setError("");
              const id = request.current || crypto.randomUUID();
              request.current = id;
              startTransition(async () => {
                try {
                  const result = await registerMeal({
                    request: id,
                    date,
                    category,
                    plan,
                    index,
                    amounts: foods.map((f) => f.amount),
                    units: foods.map((f) => f.unit as "g" | "ml" | null),
                    foods: [],
                  });
                  if (result.error) setError(result.error);
                  else {
                    setMessage(result.message!);
                    request.current = "";
                  }
                } catch {
                  setError(
                    "Não foi possível confirmar. Confira os registros antes de tentar novamente.",
                  );
                }
                feedback.current?.focus();
              });
            }}
          >
            <label>
              Refeição no diário
              <select
                required
                value={category}
                disabled={pending || !online}
                onChange={(e) => {
                  setCategory(e.target.value);
                  request.current = "";
                }}
              >
                <option value="" disabled>
                  Escolha a categoria
                </option>
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="meal-actions">
              <button
                type="submit"
                className="button-primary"
                disabled={
                  pending ||
                  !online ||
                  !category ||
                  foods.some((f) => !f.amount)
                }
              >
                {pending
                  ? "Registrando…"
                  : editing
                    ? "Confirmar porções e registrar"
                    : "Registrar conforme o plano"}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={pending || !online}
                onClick={() => {
                  setEditing(!editing);
                  setFoods(initial);
                  request.current = "";
                }}
              >
                {editing ? "Usar porções do plano" : "Ajustar porções"}
              </button>
            </div>
            {error && (
              <p
                className="form-error"
                role="alert"
                ref={feedback}
                tabIndex={-1}
              >
                {error}
              </p>
            )}
            {!online && (
              <p className="readonly-note">
                Sem conexão. O registro está bloqueado.
              </p>
            )}
          </form>
        ) : (
          <p className="readonly-note">
            Consulta do planejamento. Este projeto não recebe registros.
          </p>
        )}
      </div>
    </details>
  );
}
