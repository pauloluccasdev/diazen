"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import { ActionDisclosure } from "@/components/action-disclosure";
import { searchTacoFoods, tacoSource, type TacoFood } from "@/lib/taco";

export function TacoPicker() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const results = searchTacoFoods(query);
  function apply(food: TacoFood, button: HTMLButtonElement) {
    const form = button.form;
    if (!form) return;
    // Esses campos são não controlados; FormData lê os valores na confirmação.
    const values = {
      name: food.name,
      reference_amount: 100,
      unit: "g",
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: tacoSource(food),
    };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement
      )
        field.value = value === null ? "" : String(value);
    }
    setSelected(food.name);
    const disclosure = button.closest("details");
    if (disclosure) disclosure.open = false;
    const name = form.elements.namedItem("name");
    if (name instanceof HTMLInputElement) name.focus();
  }
  return (
    <>
      <ActionDisclosure
        title="Consultar tabela TACO"
        icon={Search}
        className="taco-lookup"
      >
        <p className="muted" id={`${id}-help`}>
          Busque o alimento e confira o preparo. A tabela usa 100 g de parte
          comestível. Para marcas e versões light sem correspondência, use o
          rótulo.
        </p>
        <label htmlFor={id}>Buscar alimento na TACO</label>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={120}
          aria-describedby={`${id}-help`}
          autoComplete="off"
        />
        {query.trim().length >= 2 && (
          <>
            <p className="muted" aria-live="polite">
              {results.length
                ? "Selecione um item para preencher os campos abaixo. Mostrando até 8 resultados; refine a busca se necessário."
                : "Nenhum alimento encontrado. Refine a busca ou preencha os valores do rótulo manualmente."}
            </p>
            <ul className="taco-results">
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={(event) => apply(food, event.currentTarget)}
                  >
                    <strong>{food.name}</strong>
                    <span>
                      {food.kcal === null
                        ? "Calorias não informadas"
                        : `${food.kcal} kcal`}{" "}
                      · por 100 g
                    </span>
                    <span className="muted">Usar este alimento</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="muted">
          Fonte: TACO, NEPA/UNICAMP, 4ª edição revisada e ampliada, 2011. Traços
          e valores não disponíveis ficam em branco.
        </p>
      </ActionDisclosure>
      {selected && (
        <p className="muted" aria-live="polite">
          Dados de “{selected}” preenchidos para 100 g. Revise os campos antes
          de salvar; alterar a referência ou unidade exige ajustar os valores
          nutricionais.
        </p>
      )}
    </>
  );
}
