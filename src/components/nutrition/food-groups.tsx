import { DisclosureLink } from "@/components/disclosure-link";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Apple,
  Check,
  ChevronRight,
  Coffee,
  HandPlatter,
  Moon,
  PencilLine,
  Plus,
  Sunrise,
  Utensils,
} from "lucide-react";
import { MealDeleteDialog } from "@/components/meal-delete-dialog";
import { number } from "@/lib/domain";
import { units, nutritionTotal, type Entry } from "@/lib/records";
import { groupFoodDay } from "@/lib/food-day";

const icons = {
  breakfast: Sunrise,
  morning_snack: Apple,
  lunch: Utensils,
  afternoon_snack: Coffee,
  dinner: HandPlatter,
  supper: Moon,
};
export function FoodGroups({
  allRows,
  rows,
  project,
  date,
  page,
  editable,
  selectedCategory,
  renderRecord,
}: {
  allRows: Entry[];
  rows: Entry[];
  project: string;
  date: string;
  page: number;
  editable: boolean;
  selectedCategory?: string;
  renderRecord: (row: Entry) => ReactNode;
}) {
  const href = (category: string, register = false, targetPage = page) =>
    `/painel/alimentacao?${new URLSearchParams({ projeto: project, data: date, pagina: String(targetPage), refeicao: category, ...(register ? { registrar: "1" } : {}) })}#${register ? "novo-registro" : `refeicao-${category}`}`;
  return (
    <div className="food-group-list">
      {groupFoodDay(allRows).map((group) => {
        const items = rows.filter((row) => row.category === group.category),
          Icon = icons[group.category];
        const recorded = group.items.length > 0,
          calories = group.totals.kcal;
        const text = !recorded
          ? "—"
          : calories.value === null
            ? "Não informado"
            : `${number(calories.value)} kcal`;
        const firstPage =
          Math.floor(
            allRows.findIndex((row) => row.category === group.category) / 20,
          ) + 1;
        return (
          <div
            className="food-meal-row"
            key={group.category}
            role="group"
            aria-label={group.label}
            data-recorded={recorded}
          >
            <details
              className="content-card meal-record-group"
              id={`refeicao-${group.category}`}
              data-recorded={recorded}
              open={selectedCategory === group.category}
            >
              <summary>
                <span
                  className={`food-meal-state${recorded ? " is-recorded" : ""}`}
                  role="img"
                  aria-label={
                    recorded
                      ? "Com alimentos registrados"
                      : "Sem alimentos registrados"
                  }
                >
                  {recorded && <Check size={18} aria-hidden="true" />}
                </span>
                <span className="food-meal-thumbnail" aria-hidden="true">
                  {recorded && group.category !== "supper" ? (
                    <Image
                      src={`/images/meals/${group.category.replaceAll("_", "-")}.webp`}
                      width={100}
                      height={70}
                      alt=""
                      title="Ilustração da categoria"
                    />
                  ) : (
                    <Icon size={30} />
                  )}
                </span>
                <span className="food-meal-icon" aria-hidden="true">
                  <Icon size={26} />
                </span>
                <span className="food-meal-identity">
                  <strong>{group.label}</strong>
                  <small>
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "alimento" : "alimentos"}
                  </small>
                </span>
                <span className="food-meal-preview">
                  {recorded ? (
                    group.items.slice(0, 3).map((row) => {
                      const kcal = nutritionTotal([row], "kcal").value;
                      return (
                        <span className="food-preview-line" key={row.id}>
                          <span>{row.name}</span>
                          <span className="food-preview-amount">
                            {number(row.amount!, 3)} {units[row.unit!]}
                          </span>
                          <span className="food-preview-kcal">
                            {kcal === null ? "—" : `${number(kcal)} kcal`}
                          </span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="muted">Nenhum registro ainda</span>
                  )}
                  {group.items.length > 3 && (
                    <small>+{group.items.length - 3} alimentos</small>
                  )}
                </span>
                <span className="food-record-calories food-meal-energy">
                  <span className="meal-calorie-value">{text}</span>
                  {calories.value !== null && calories.missing > 0 && (
                    <small>Subtotal parcial</small>
                  )}
                </span>
                <ChevronRight
                  className="food-meal-chevron"
                  size={21}
                  aria-hidden="true"
                />
              </summary>
              <div className="meal-record-items">
                {items.map(renderRecord)}
                {recorded && items.length < group.items.length && (
                  <p className="food-page-note">
                    {items.length} de {group.items.length} alimentos nesta
                    página.{" "}
                    {items.length === 0 && (
                      <Link href={href(group.category, false, firstPage)}>
                        Consultar os alimentos desta refeição
                      </Link>
                    )}
                  </p>
                )}
                {!recorded && (
                  <p className="food-page-note">
                    Ainda não há alimentos registrados nesta categoria.
                  </p>
                )}
                {editable && (
                  <DisclosureLink
                    targetId="novo-registro"
                    category={group.category}
                    className="button-secondary food-add-in-group"
                    href={href(group.category, true)}
                  >
                    <Plus size={18} aria-hidden="true" />
                    Adicionar em {group.label}
                  </DisclosureLink>
                )}
              </div>
            </details>
            {editable && (
              <div
                className={`food-meal-actions${!recorded ? " food-meal-actions-empty" : ""}`}
              >
                {recorded ? (
                  <>
                    <DisclosureLink
                      targetId={`refeicao-${group.category}`}
                      navigate={!items.length}
                      className="food-icon-action"
                      href={href(
                        group.category,
                        false,
                        items.length ? page : firstPage,
                      )}
                      ariaLabel={`Editar alimentos: ${group.label}`}
                    >
                      <PencilLine size={20} aria-hidden="true" />
                    </DisclosureLink>
                    <MealDeleteDialog
                      project={project}
                      date={date}
                      category={group.category}
                      compact
                    />
                  </>
                ) : (
                  <DisclosureLink
                    targetId="novo-registro"
                    category={group.category}
                    className="food-icon-action food-empty-add"
                    href={href(group.category, true)}
                    ariaLabel={`Adicionar alimento: ${group.label}`}
                  >
                    <Plus size={22} aria-hidden="true" />
                    <span>Adicionar</span>
                  </DisclosureLink>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
