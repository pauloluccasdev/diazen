"use client";
import { useState } from "react";
import {
  type OnlineFoodReference,
  type OnlineFoodHit,
  onlineFoodUrl,
} from "@/lib/online-food";
const nextQuery = { search: 0, product: 0 };
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
  const [query, setQuery] = useState(name),
    [hits, setHits] = useState<OnlineFoodHit[]>([]),
    [reference, setReference] = useState<OnlineFoodReference | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  async function lookup(kind: "search" | "product", value: string) {
    if (pending || disabled) return;
    if (Date.now() < nextQuery[kind]) {
      setMessage("Aguarde alguns segundos para uma nova consulta.");
      return;
    }
    nextQuery[kind] = Date.now() + (kind === "search" ? 6500 : 4500);
    setPending(true);
    setMessage("");
    setReference(null);
    try {
      const r = await fetch("/api/alimentos/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, query: value }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMessage(data.message ?? "Não foi possível consultar.");
        return;
      }
      if (kind === "search") {
        setHits(data.hits);
        setReference(null);
        if (!data.hits.length)
          setMessage(
            "Nenhum produto encontrado. Tente outro nome ou código de barras.",
          );
      } else {
        setReference(data.reference);
        setHits([]);
      }
    } catch {
      setMessage("Confira a conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="online-food-search data-form">
      <h4>Consultar outra fonte</h4>
      <p className="intro">
        Busca no Open Food Facts, base colaborativa de rótulos. Só o termo
        pesquisado é enviado; confira o produto e use como referência padrão,
        que pode variar por marca.
      </p>
      <label>
        Nome ou código de barras
        <input
          value={query}
          maxLength={100}
          disabled={disabled || pending}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button-secondary"
        disabled={disabled || pending || query.trim().length < 2}
        onClick={() =>
          lookup(
            /^\d{8,14}$/.test(query.trim()) ? "product" : "search",
            query.trim(),
          )
        }
      >
        {pending ? "Consultando…" : "Consultar online"}
      </button>
      <p aria-live="polite">{message}</p>
      {hits.map((hit) => (
        <div className="online-food-result" key={hit.code}>
          <strong>{hit.name}</strong>
          <span>
            {hit.brand || "Marca não informada"} · {hit.code}
          </span>
          <button
            type="button"
            className="button-secondary"
            disabled={disabled || pending}
            aria-label={`Ver composição de ${hit.name}`}
            onClick={() => lookup("product", hit.code)}
          >
            Ver composição deste produto
          </button>
        </div>
      ))}
      {reference && (
        <div className="online-food-result">
          <strong>
            {reference.name} · {reference.brand}
          </strong>
          <p>
            Referência por {reference.amount} {reference.unit}:{" "}
            {reference.values.kcal ?? "não informado"} kcal · proteínas{" "}
            {reference.values.protein ?? "não informado"} g · carboidratos{" "}
            {reference.values.carbs ?? "não informado"} g · gorduras{" "}
            {reference.values.fat ?? "não informado"} g.
          </p>
          <a
            href={onlineFoodUrl(reference.code)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Conferir rótulo e fonte ↗
          </a>
          <p>
            Use esta composição como padrão apenas se corresponder ao alimento e
            à versão desejada (por exemplo, light).
          </p>
          {(!amount || unit !== reference.unit) && (
            <p className="form-error">
              Informe acima uma porção em {reference.unit} para usar esta
              referência. Não convertemos ml em g.
            </p>
          )}
          <button
            type="button"
            className="button-primary"
            disabled={disabled || pending || !amount || unit !== reference.unit}
            onClick={() => onUse(reference)}
          >
            Usar esta referência padrão
          </button>
        </div>
      )}
      <p className="field-hint">
        Dados:{" "}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Food Facts
        </a>{" "}
        ·{" "}
        <a
          href="https://opendatacommons.org/licenses/odbl/1-0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ODbL
        </a>
        . Valores ausentes continuam pendentes.
      </p>
    </div>
  );
}
