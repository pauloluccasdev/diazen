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
  const r = await fetch("/api/alimentos/online", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, query }),
    signal: AbortSignal.timeout(15000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Consulta indisponível");
  return r.json();
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
  useEffect(() => {
    if (disabled || !amount || !unit || name.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      setMessage("Buscando referência padrão online…");
      lookup(name, unit, () => active)
        .then((reference) => {
          if (!active) return;
          if (reference) apply(reference);
          else
            setMessage(
              "Sem composição disponível. Você pode informar os valores abaixo.",
            );
        })
        .catch(() => {
          if (active)
            setMessage(
              "Consulta indisponível. Você pode informar os valores abaixo.",
            );
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, amount, unit, disabled]);
  return message && !disabled && amount && unit ? (
    <p className="field-hint" aria-live="polite">
      {message}
    </p>
  ) : null;
}
