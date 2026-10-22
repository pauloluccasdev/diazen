"use client";
import { useState, useTransition } from "react";
import { searchFoods } from "@/app/painel/alimentos/actions";
import type { LibraryFood } from "@/lib/food-library";
import { units } from "@/lib/records";
export function RecipeIngredients() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryFood[]>([]);
  const [ingredients, setIngredients] = useState<LibraryFood[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const search = (next: number) =>
    startTransition(async () => {
      const result = await searchFoods(query, next);
      setResults(result.items);
      setMore(result.hasMore);
      setPage(next);
      setMessage(
        result.error
          ? "Não foi possível buscar. Tente novamente."
          : result.items.length
            ? ""
            : "Nenhum alimento encontrado. Cadastre um alimento próprio antes de compor a receita.",
      );
    });
  return (
    <>
      <label>
        Buscar ingredientes
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
        />
      </label>
      <button
        type="button"
        className="button-secondary"
        disabled={pending}
        onClick={() => search(1)}
      >
        {pending ? "Buscando…" : "Buscar alimentos"}
      </button>
      <p role="status">{message}</p>
      <ul>
        {results.map((food) => (
          <li key={food.id}>
            <span>
              {food.name} · {units[food.unit!]}
            </span>{" "}
            <button
              type="button"
              className="button-secondary"
              disabled={
                ingredients.some((i) => i.id === food.id) ||
                ingredients.length >= 100
              }
              onClick={() => setIngredients((previous) => [...previous, food])}
            >
              Incluir {food.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="panel-nav">
        {page > 1 && (
          <button
            type="button"
            className="button-secondary"
            disabled={pending}
            onClick={() => search(page - 1)}
          >
            Ingredientes anteriores
          </button>
        )}
        {more && (
          <button
            type="button"
            className="button-secondary"
            disabled={pending}
            onClick={() => search(page + 1)}
          >
            Próximos ingredientes
          </button>
        )}
      </div>
      {ingredients.length === 0 && (
        <p className="muted">
          Inclua pelo menos um ingrediente. Até 100 ingredientes por receita.
        </p>
      )}
      {ingredients.map((food) => (
        <div className="content-card" key={food.id}>
          <input type="hidden" name="ingredient_id" value={food.id} />
          <label>
            Quantidade de {food.name} ({units[food.unit!]})
            <input
              name="ingredient_amount"
              type="number"
              required
              min="0.001"
              max={100000}
              step="0.001"
              defaultValue={food.reference_amount}
            />
          </label>
          <button
            type="button"
            className="button-secondary"
            onClick={() =>
              setIngredients((previous) =>
                previous.filter((i) => i.id !== food.id),
              )
            }
          >
            Remover {food.name}
          </button>
        </div>
      ))}
    </>
  );
}
