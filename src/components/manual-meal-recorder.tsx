"use client";
import { useRef, useState, useTransition } from "react";
import { RecordFields } from "./forms/record-fields";
import { categories } from "@/lib/records";
import { number } from "@/lib/domain";
import {
  analyzePlanFood,
  foodComposition,
  planNutrients,
} from "@/lib/diet-plan";
import { newMealFood, type MealFood } from "@/lib/meal-registration";
import { registerMeal } from "@/app/painel/plano/registrar";
import { useOnline } from "@/lib/use-online";
import { OnlineFoodSearch } from "./online-food-search";
import { onlineFoodSource } from "@/lib/online-food";
import { searchTacoFoods, tacoSource } from "@/lib/taco";
function fields(form: HTMLFormElement, prefix: string) {
  const get = (name: string) =>
    form.elements.namedItem(prefix + name) as
      HTMLInputElement | HTMLSelectElement | null;
  const n = (name: string) => {
    const raw = get(name)?.value.trim();
    return raw ? Number(raw.replace(",", ".")) : null;
  };
  return {
    get,
    n,
    name: get("name")?.value.trim() ?? "",
    amount: n("amount"),
    unit: get("unit")?.value ?? "g",
    reference: n("reference_amount"),
    source: get("source")?.value ?? "",
    values: Object.fromEntries(
      planNutrients.map((k) => [k, n(k)]),
    ) as MealFood["values"],
  };
}
function FoodRow({
  prefix,
  onChange,
  onRemove,
  disabled,
}: {
  prefix: string;
  onChange: () => void;
  onRemove?: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    previous = useRef("");
  const [snapshot, setSnapshot] = useState<{
    name: string;
    amount: number | null;
    unit: string;
    kcal: number | null;
    portionKcal: number | null;
  }>({ name: "", amount: null, unit: "g", kcal: null, portionKcal: null });
  const [query, setQuery] = useState(""),
    [lookup, setLookup] = useState(false);
  function sync() {
    const form = ref.current?.closest("form");
    if (!form) return;
    const data = fields(form, prefix);
    setSnapshot({
      name: data.name,
      amount: data.amount,
      unit: data.unit,
      kcal: data.values.kcal,
      portionKcal:
        data.values.kcal !== null && data.reference && data.amount
          ? (data.values.kcal * data.amount) / data.reference
          : null,
    });
    onChange();
  }
  function apply(values: Record<string, string | number | null>) {
    const form = ref.current?.closest("form");
    if (!form) return;
    for (const [key, value] of Object.entries(values)) {
      const input = fields(form, prefix).get(key);
      if (input) input.value = value === null ? "" : String(value);
    }
    sync();
  }
  return (
    <div
      className="meal-food-editor"
      ref={ref}
      onInput={sync}
      onBlur={(event) => {
        const target = event.target as HTMLInputElement;
        if (
          target.name !== prefix + "name" ||
          target.value.trim() === previous.current
        )
          return;
        previous.current = target.value.trim();
        const form = target.form!;
        const data = fields(form, prefix);
        const food = analyzePlanFood({
          ...newMealFood(),
          name: data.name,
          amount: 100,
          unit: data.unit === "g" || data.unit === "ml" ? data.unit : null,
        });
        apply({
          reference_amount: 100,
          source: food.source || "Informado pelo usuário",
          ...foodComposition(food),
        });
      }}
    >
      <RecordFields kind="alimentacao" foodOnly prefix={prefix} />
      <p className="field-hint" aria-live="polite">
        {snapshot.portionKcal === null
          ? "Calorias ainda não informadas"
          : `${number(snapshot.portionKcal)} kcal nesta porção`}
      </p>
      <details>
        <summary>Buscar referência para calcular calorias</summary>
        <label>
          Buscar na TACO
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={120}
          />
        </label>
        {searchTacoFoods(query).map((food) => (
          <button
            key={food.id}
            type="button"
            className="button-secondary"
            onClick={() => {
              previous.current = food.name;
              apply({
                name: food.name,
                unit: "g",
                reference_amount: 100,
                source: tacoSource(food),
                kcal: food.kcal,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
              });
            }}
          >
            {food.name} · {food.kcal ?? "—"} kcal / 100 g
          </button>
        ))}
      </details>
      {snapshot.name.length > 1 &&
        snapshot.amount &&
        snapshot.kcal === null &&
        !lookup && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => setLookup(true)}
          >
            Buscar composição online
          </button>
        )}
      {lookup &&
        snapshot.name.length > 1 &&
        snapshot.amount &&
        snapshot.kcal === null &&
        (snapshot.unit === "g" || snapshot.unit === "ml") && (
          <OnlineFoodSearch
            name={snapshot.name}
            amount={snapshot.amount}
            unit={snapshot.unit}
            disabled={disabled}
            onUse={(reference) => {
              const form = ref.current?.closest("form");
              if (!form) return;
              const data = fields(form, prefix);
              if (data.name !== snapshot.name || data.values.kcal !== null)
                return;
              apply({
                reference_amount: reference.amount,
                unit: reference.unit,
                source: onlineFoodSource(reference),
                ...reference.values,
              });
            }}
          />
        )}
      {onRemove && (
        <button type="button" className="button-secondary" onClick={onRemove}>
          Retirar alimento desta refeição
        </button>
      )}
    </div>
  );
}
export function ManualMealRecorder({
  date,
  min,
  max,
}: {
  date: string;
  min: string;
  max: string;
}) {
  const form = useRef<HTMLFormElement>(null),
    feedback = useRef<HTMLParagraphElement>(null),
    request = useRef("");
  const [rows, setRows] = useState([""]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [total, setTotal] = useState<{ value: number | null; missing: number }>({
      value: null,
      missing: 1,
    });
  const [pending, startTransition] = useTransition();
  const online = useOnline();
  function calculate(keys = rows) {
    if (!form.current) return;
    const parts = keys.map((prefix) => {
      const f = fields(form.current!, prefix);
      return f.values.kcal !== null && f.amount && f.reference
        ? (f.values.kcal * f.amount) / f.reference
        : null;
    });
    const known = parts.filter((v): v is number => v !== null);
    setTotal({
      value: known.length ? known.reduce((a, b) => a + b, 0) : null,
      missing: parts.length - known.length,
    });
    request.current = "";
    setMessage("");
  }
  return (
    <details className="content-card record-create manual-meal-recorder">
      <summary>Registrar refeição</summary>
      <p className="intro">
        Informe os alimentos e as porções que você consumiu. A composição
        encontrada pode ser revisada antes de salvar.
      </p>
      <form
        ref={form}
        className="data-form"
        onChange={(event) => {
          const target = event.target;
          if (!(
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement
          ))
            return;
          const name = target.name;
          if (name === "logged_on" || name === "category") {
            request.current = "";
            setMessage("");
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || !online || message) return;
          setError("");
          const data = new FormData(form.current!);
          try {
            const foods = rows.map((prefix) => {
              const f = fields(form.current!, prefix);
              if (!f.reference || f.reference <= 0 || !f.amount)
                throw Error("Confira as quantidades e referências.");
              return {
                ...newMealFood(),
                name: f.name,
                amount: f.amount,
                unit: f.unit as MealFood["unit"],
                source: f.source,
                values: Object.fromEntries(
                  planNutrients.map((k) => [
                    k,
                    f.values[k] === null
                      ? null
                      : (f.values[k]! * f.amount!) / f.reference!,
                  ]),
                ) as MealFood["values"],
              };
            });
            const id = request.current || crypto.randomUUID();
            request.current = id;
            startTransition(async () => {
              try {
                const result = await registerMeal({
                  request: id,
                  date: String(data.get("logged_on")),
                  category: String(data.get("category")),
                  plan: null,
                  index: null,
                  amounts: [],
                  foods,
                });
                if (result.error) setError(result.error);
                else {
                  setMessage(result.message!);
                  request.current = "";
                }
              } catch {
                setError(
                  "Não foi possível confirmar o registro. Confira o diário antes de tentar novamente.",
                );
              }
              feedback.current?.focus();
            });
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Confira os alimentos.",
            );
          }
        }}
      >
        <fieldset disabled={pending || !online}>
          <label>
            Data
            <input
              type="date"
              name="logged_on"
              defaultValue={date}
              min={min}
              max={max}
              required
            />
          </label>
          <label>
            Refeição
            <select name="category" defaultValue="breakfast">
              {Object.entries(categories).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {rows.map((prefix, index) => (
            <FoodRow
              key={prefix}
              prefix={prefix}
              disabled={pending || !online}
              onChange={() => calculate()}
              onRemove={
                index
                  ? () => {
                      const next = rows.filter((k) => k !== prefix);
                      setRows(next);
                      calculate(next);
                    }
                  : undefined
              }
            />
          ))}
          <button
            type="button"
            className="button-secondary"
            disabled={rows.length >= 100}
            onClick={() => {
              setRows([...rows, crypto.randomUUID() + "_"]);
              setTotal({ ...total, missing: total.missing + 1 });
              request.current = "";
            }}
          >
            Adicionar outro alimento
          </button>
          <p className="meal-total" aria-live="polite">
            Total da refeição:{" "}
            {total.value === null
              ? "calorias pendentes"
              : `${number(total.value)} kcal`}
            {total.missing > 0
              ? ` · ${total.missing} alimento(s) sem calorias`
              : ""}
          </p>
          <button
            type="submit"
            className="button-primary"
            disabled={Boolean(message)}
          >
            {pending ? "Registrando…" : "Salvar registro"}
          </button>
        </fieldset>
        {(error || message) && (
          <p
            ref={feedback}
            tabIndex={-1}
            role={error ? "alert" : "status"}
            className={error ? "form-error" : ""}
          >
            {error || message}
          </p>
        )}
        {!online && (
          <p className="readonly-note">
            Sem conexão. O registro de refeições está bloqueado.
          </p>
        )}
      </form>
    </details>
  );
}
