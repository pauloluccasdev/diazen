"use client";
import { useEffect, useEffectEvent, useState } from "react";
import type { OnlineFoodReference, OnlineFoodHit } from "@/lib/online-food";

// One queue per tab: imports may contain many foods, but the public provider
// accepts only a few searches per minute. Repeated names share one lookup.
let queue: Promise<unknown> = Promise.resolve();
const next = { search: 0, product: 0 };
const cached = new Map<string, Promise<OnlineFoodReference | null>>();
async function request(
  kind: "search" | "product",
  query: string,
  active: () => boolean,
) {
  const delay = Math.max(0, next[kind] - Date.now());
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  if (!active()) return null;
  next[kind] = Date.now() + (kind === "search" ? 6500 : 4500);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/alimentos/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, query }),
        signal: AbortSignal.timeout(15000),
      });
      if (r.status === 404) return null;
      if (r.ok) return r.json();
      if (![429, 500, 502, 503, 504].includes(r.status))
        throw new Error("Consulta recusada");
    } catch (error) {
      if (
        attempt === 2 ||
        (error instanceof Error && error.message === "Consulta recusada")
      )
        throw error;
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 7000 * (attempt + 1)));
      if (!active()) return null;
      next[kind] = Date.now() + (kind === "search" ? 6500 : 4500);
    }
  }
  throw new Error("Consulta indisponível");
}
function lookup(name: string, unit: "g" | "ml", active: () => boolean) {
  const key = `${name.trim().toLocaleLowerCase("pt-BR")}:${unit}`;
  const previous = cached.get(key);
  if (previous) return previous;
  const task = queue
    .catch(() => {})
    .then(async () => {
      if (!active()) {
        cached.delete(key);
        return null;
      }
      const data = await request("search", name, active);
      const hits: OnlineFoodHit[] = data?.hits ?? [];
      for (const hit of hits) {
        if (!active()) {
          cached.delete(key);
          return null;
        }
        const product = await request("product", hit.code, active);
        const reference: OnlineFoodReference | undefined = product?.reference;
        if (reference?.unit === unit && reference.values.kcal !== null)
          return reference;
      }
      return null;
    });
  cached.set(key, task);
  queue = task;
  task.catch(() => cached.delete(key));
  return task;
}
export function OnlineFoodSearch({
  name,
  amount,
  unit,
  disabled,
  onUse,
}: {
  name: string;
  amount: number | null;
  unit: "g" | "ml" | null;
  disabled: boolean;
  onUse: (reference: OnlineFoodReference) => void;
}) {
  const apply = useEffectEvent(onUse);
  const [message, setMessage] = useState("Buscando referência padrão online…");
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (disabled || !amount || !unit || name.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      setFailed(false);
      setMessage("Buscando referência padrão online…");
      lookup(name, unit, () => active)
        .then((reference) => {
          if (!active) return;
          if (reference) apply(reference);
          else {
            setFailed(true);
            setMessage(
              "Ainda não encontramos uma referência. Tentaremos novamente quando você solicitar.",
            );
          }
        })
        .catch(() => {
          if (active) {
            setFailed(true);
            setMessage(
              "A fonte está temporariamente indisponível. Tentamos novamente automaticamente; você pode repetir a busca.",
            );
          }
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, amount, unit, disabled, retry]);
  return message && !disabled && amount && unit ? (
    <div className="plan-reference-status">
      <p className="field-hint" aria-live="polite">
        {message}
      </p>
      {failed && (
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            cached.delete(`${name.trim().toLocaleLowerCase("pt-BR")}:${unit}`);
            setRetry((v) => v + 1);
          }}
        >
          Tentar buscar novamente
        </button>
      )}
    </div>
  ) : null;
}
