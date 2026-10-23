import { ReturnLink } from "@/components/return-link";
import Link from "next/link";
import { requireAccount } from "@/lib/data";
import { number } from "@/lib/domain";
import { nutrients, units } from "@/lib/records";
import type { LibraryFood } from "@/lib/food-library";
import { ActionForm } from "@/components/forms/action-form";
import { LibraryFoodFields } from "@/components/forms/library-food-fields";
import { RecipeIngredients } from "@/components/forms/recipe-ingredients";
import { FoodUseFields } from "@/components/forms/food-use-fields";
import {
  saveFood,
  changeLibraryFood,
  createRecipe,
  addLibraryFood,
} from "./actions";
export const metadata = { title: "Alimentos e receitas" };
export default async function Foods({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; filtro?: string; pagina?: string }>;
}) {
  const { client } = await requireAccount();
  const filters = await searchParams,
    q = (filters.busca ?? "")
      .trim()
      .slice(0, 120)
      .replace(/[%_\\]/g, ""),
    filter = ["favorite", "food", "recipe"].includes(filters.filtro ?? "")
      ? filters.filtro!
      : "";
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(filters.pagina) || 1)),
  );
  let query = client
    .from("food_library")
    .select("*")
    .ilike("name", `%${q}%`)
    .order("favorite", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20);
  if (filter === "favorite") query = query.eq("favorite", true);
  else if (filter) query = query.eq("kind", filter);
  const [library, active] = await Promise.all([
    query.returns<LibraryFood[]>(),
    client
      .from("projects")
      .select("id,name")
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);
  if (library.error || active.error)
    throw new Error("Falha ao carregar biblioteca");
  const foods = (library.data ?? []).slice(0, 20),
    more = (library.data?.length ?? 0) > 20;
  const link = (next: number) =>
    `/painel/alimentos?${new URLSearchParams({ busca: q, filtro: filter, pagina: String(next) })}`;
  return (
    <>
      <section className="welcome">
        <ReturnLink href="/painel/alimentacao">Voltar à alimentação</ReturnLink>
        <p className="eyebrow">Sua biblioteca privada</p>
        <h1>
          Alimentos e receitas<span className="accent">.</span>
        </h1>
        <p className="intro">
          Salve a composição informada e reutilize no diário. Alterações aqui
          preservam os registros anteriores e as receitas já salvas.
        </p>
      </section>
      <details className="content-card">
        <summary>Cadastrar alimento próprio</summary>
        <ActionForm action={saveFood} submit="Salvar alimento">
          <LibraryFoodFields />
        </ActionForm>
      </details>
      <details className="content-card">
        <summary>Criar receita</summary>
        <p className="intro">
          Escolha alimentos próprios e suas quantidades. O rendimento define
          quantas porções a receita completa produz. Nutriente desconhecido em
          qualquer ingrediente mantém o total desse nutriente desconhecido. Os
          ingredientes ficam preservados com os valores usados nesta criação.
        </p>
        <ActionForm action={createRecipe} submit="Salvar receita">
          <input type="hidden" name="recipe_id" value={crypto.randomUUID()} />
          <label>
            Nome da receita
            <input name="recipe_name" required maxLength={120} />
          </label>
          <label>
            Rendimento (porções)
            <input
              type="number"
              name="portions"
              min="0.001"
              max={100000}
              step="0.001"
              required
              defaultValue={1}
            />
          </label>
          <RecipeIngredients />
        </ActionForm>
      </details>
      <form className="filter-form">
        <label>
          Buscar na biblioteca
          <input name="busca" maxLength={120} defaultValue={q} />
        </label>
        <label>
          Mostrar
          <select name="filtro" defaultValue={filter}>
            <option value="">Todos</option>
            <option value="favorite">Favoritos</option>
            <option value="food">Alimentos</option>
            <option value="recipe">Receitas</option>
          </select>
        </label>
        <button className="button-primary">Filtrar biblioteca</button>
      </form>
      <section aria-label="Biblioteca de alimentos">
        <h2>Itens salvos</h2>
        {!foods.length && (
          <p className="intro">Nenhum item para esta consulta.</p>
        )}
        {foods.map((food) => (
          <article className="content-card" key={food.id}>
            <p className="eyebrow">
              {food.kind === "recipe" ? "Receita" : "Alimento próprio"}
              {food.favorite ? " · Favorito" : ""}
            </p>
            <h3>{food.name}</h3>
            <p className="intro">
              Referência: {number(food.reference_amount!, 3)}{" "}
              {units[food.unit!]}. Fonte: {food.source}
            </p>
            <p>
              {Object.entries(nutrients)
                .map(
                  ([key, label]) =>
                    `${label}: ${food[key as keyof typeof nutrients] == null ? "não informado" : `${number(food[key as keyof typeof nutrients]!)} ${key === "kcal" ? "kcal" : "g"}`}`,
                )
                .join(" · ")}
            </p>
            {food.ingredients && (
              <details>
                <summary>Ingredientes da receita</summary>
                <ul>
                  {food.ingredients.map((i, index) => (
                    <li key={index}>
                      {i.name} · {number(i.amount!, 3)} {units[i.unit!]} ·{" "}
                      {i.source}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <ActionForm
              action={changeLibraryFood}
              submit={food.favorite ? "Remover favorito" : "Favoritar"}
            >
              <input type="hidden" name="food_id" value={food.id} />
              <input type="hidden" name="operation" value="favorite" />
              <input
                type="hidden"
                name="favorite"
                value={String(!food.favorite)}
              />
            </ActionForm>
            {active.data && (
              <details>
                <summary>Usar no diário</summary>
                <p className="muted">
                  Destino: projeto ativo “{active.data.name}”. Uma cópia da
                  composição será salva.
                </p>
                <ActionForm
                  action={addLibraryFood}
                  submit="Adicionar ao diário"
                >
                  <input type="hidden" name="saved_id" value={food.id} />
                  <FoodUseFields
                    unit={food.unit!}
                    amount={food.kind === "recipe" ? 1 : food.reference_amount}
                  />
                </ActionForm>
              </details>
            )}
            {food.kind === "food" && (
              <details>
                <summary>Editar alimento</summary>
                <ActionForm action={saveFood} submit="Atualizar alimento">
                  <LibraryFoodFields food={food} />
                </ActionForm>
              </details>
            )}
            <details>
              <summary>Remover da biblioteca</summary>
              <ActionForm
                action={changeLibraryFood}
                submit="Excluir da biblioteca"
              >
                <input type="hidden" name="food_id" value={food.id} />
                <input type="hidden" name="operation" value="delete" />
                <label className="checkbox-label">
                  <input type="checkbox" name="confirm" required />
                  Confirmo a remoção. O diário e as receitas já salvas serão
                  preservados.
                </label>
              </ActionForm>
            </details>
          </article>
        ))}
      </section>
      <nav className="panel-nav" aria-label="Paginação da biblioteca">
        {page > 1 && <Link href={link(page - 1)}>Anteriores</Link>}
        {more && <Link href={link(page + 1)}>Próximos</Link>}
      </nav>
    </>
  );
}
