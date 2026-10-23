import { ActionDisclosure } from "@/components/action-disclosure";
import { Copy, History, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate, number, today } from "@/lib/domain";
import { categories, units, type Entry } from "@/lib/records";
import { ActionForm } from "./forms/action-form";
import { FoodUseFields } from "./forms/food-use-fields";
import { addLibraryFood, copyMeal } from "@/app/painel/alimentos/actions";
export async function FoodConveniences({
  client,
  project,
  date,
  activeName,
}: {
  client: SupabaseClient;
  project: string;
  date: string;
  activeName?: string;
}) {
  const { data, error } = await client
    .from("meal_items")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(20)
    .returns<Entry[]>();
  if (error) throw new Error("Falha ao carregar alimentos recentes");
  return (
    <section
      className="content-card food-conveniences"
      aria-label="Conveniências alimentares"
    >
      <h2>Reutilize seus alimentos</h2>
      <p>
        <Link
          className="button-secondary project-consult"
          href="/painel/alimentos"
        >
          <BookOpen size={20} aria-hidden="true" />
          <span>Alimentos, receitas e favoritos</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </p>
      {activeName && (
        <>
          <p className="muted">
            Novos registros serão adicionados ao projeto ativo “{activeName}”. O
            histórico consultado permanece preservado.
          </p>
          <ActionDisclosure
            title="Alimentos recentes"
            icon={History}
            className="standalone-disclosure"
          >
            <p className="muted">
              Os últimos 20 registros da sua conta, incluindo o histórico.
              Reutilizar salva uma nova cópia.
            </p>
            {!data?.length && <p>Sem alimentos recentes.</p>}
            {data?.map((food) => (
              <details className="content-card" key={food.id}>
                <summary>
                  {food.name} · {number(food.amount!, 3)} {units[food.unit!]} ·{" "}
                  {formatDate(food.logged_on)}
                </summary>
                <p className="muted">
                  Fonte: {food.source}. Referência:{" "}
                  {number(food.reference_amount!, 3)} {units[food.unit!]}.
                </p>
                <ActionForm
                  action={addLibraryFood}
                  submit="Reutilizar alimento"
                >
                  <input type="hidden" name="recent_id" value={food.id} />
                  <FoodUseFields
                    date={date}
                    amount={food.amount}
                    unit={food.unit!}
                  />
                </ActionForm>
              </details>
            ))}
          </ActionDisclosure>
          <ActionDisclosure
            title="Copiar refeição"
            icon={Copy}
            className="standalone-disclosure"
          >
            <p className="intro">
              Origem: projeto consultado. Copia todos os alimentos da categoria
              e data escolhidas, inclusive além da página atual. O destino é o
              projeto ativo. Não substitui registros existentes e desfaz a
              conclusão manual do dia de destino.
            </p>
            <ActionForm action={copyMeal} submit="Confirmar cópia da refeição">
              <input type="hidden" name="source_project" value={project} />
              <input
                type="hidden"
                name="request_id"
                value={crypto.randomUUID()}
              />
              <label>
                Data de origem
                <input
                  type="date"
                  name="source_date"
                  required
                  max={today()}
                  defaultValue={date}
                />
              </label>
              <label>
                Refeição de origem
                <select name="source_category">
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data de destino
                <input
                  type="date"
                  name="target_date"
                  required
                  max={today()}
                  defaultValue={date}
                />
              </label>
              <label>
                Refeição de destino
                <select name="target_category">
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="confirm" required />
                Confirmo adicionar uma cópia dos alimentos ao projeto ativo,
                preservando os registros existentes.
              </label>
            </ActionForm>
          </ActionDisclosure>
        </>
      )}
    </section>
  );
}
