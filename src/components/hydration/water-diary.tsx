import { WaterEntryForm } from "./water-entry-form";
import "./hydration.css";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Clock3,
  Droplet,
  GlassWater,
  PencilLine,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import { ModuleContext } from "@/components/shell/module-context";
import { ModuleHeading } from "@/components/shell/module-heading";
import { DisclosureLink } from "@/components/disclosure-link";
import { ProgressRing } from "@/components/progress-ring";
import { ActionForm } from "@/components/forms/action-form";
import { changeWaterGoal } from "@/app/painel/projetos/actions";
import { type Project, number, today } from "@/lib/domain";
import type { Entry, Summary } from "@/lib/records";
import type { HydrationDay } from "@/lib/hydration-metrics";
import type { WaterContainer } from "@/lib/water-containers";
import { ContainerManager } from "./container-manager";

export function WaterDiary({
  projects,
  selected,
  active,
  date,
  summary,
  rows,
  page,
  hasMore,
  containers,
  days,
  registrar,
  preset,
  renderRecord,
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  summary: Summary;
  rows: Entry[];
  page: number;
  hasMore: boolean;
  containers: WaterContainer[];
  days: HydrationDay[];
  registrar?: string;
  preset?: number;
  renderRecord: (row: Entry) => ReactNode;
}) {
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const consumed = summary.water_ml,
    goal = summary.water_goal;
  const percent =
    consumed !== null && goal !== null && goal > 0
      ? Math.round((consumed / goal) * 100)
      : null;
  const remaining =
    consumed !== null && goal !== null ? Math.max(0, goal - consumed) : null;
  const liters = (ml: number | null) =>
    ml === null ? "—" : `${number(ml / 1000, 2)} L`;
  const base = `/painel/agua?${new URLSearchParams({ projeto: selected.id, data: date })}`;
  const max =
    selected.ends_on && selected.ends_on < today() ? selected.ends_on : today();
  const chartMax = Math.max(
    1000,
    ...days.flatMap((day) => [day.consumed ?? 0, day.goal ?? 0]),
  );
  return (
    <div className="module-page module-agua water-diary">
      <ModuleContext
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path="/painel/agua"
      />
      <ModuleHeading
        key={`${selected.id}-${date}`}
        title="Hidratação"
        description="Acompanhe seu consumo diário de água e sua meta de referência."
        project={{ id: selected.id, name: selected.name }}
        date={date}
        path="/painel/agua"
      />
      {!editable && (
        <p className="readonly-note">
          {selected.status === "DRAFT"
            ? "Rascunhos não recebem registros."
            : "Histórico somente leitura."}
          {active && (
            <>
              {" "}
              <Link href={`/painel/agua?projeto=${active.id}`}>
                Registrar no projeto ativo “{active.name}” →
              </Link>
            </>
          )}
        </p>
      )}
      <div className="water-top-grid">
        <section
          className="content-card water-goal-card"
          aria-label="Hidratação na data consultada"
        >
          <div className="water-goal-detail">
            <h2>
              <Target size={20} aria-hidden="true" />
              Meta diária
            </h2>
            <strong>{liters(goal)}</strong>
            <p>Referência personalizada</p>
            {editable && (
              <DisclosureLink
                className="button-secondary water-edit-goal"
                ariaLabel="Editar meta"
                targetId="meta-agua"
                href={`${base}#meta-agua`}
              >
                <PencilLine size={17} aria-hidden="true" />
                <span>Editar meta</span>
              </DisclosureLink>
            )}
          </div>
          <ProgressRing
            value={consumed}
            max={goal}
            label="Progresso da hidratação na data consultada"
          >
            <strong className="water-ring-percent">
              {percent === null ? "—" : `${percent}%`}
            </strong>
            <strong className="water-ring-volume">{liters(consumed)}</strong>
            <span>
              {goal === null ? "Sem meta configurada" : `de ${liters(goal)}`}
            </span>
          </ProgressRing>
          <div className="water-mobile-remaining">
            <span>
              {remaining === null
                ? "Consumo ainda não informado"
                : remaining === 0
                  ? "Referência alcançada"
                  : "Faltam"}
            </span>
            {remaining !== null && <strong>{liters(remaining)}</strong>}
          </div>
          <div className="water-bottle-dark" aria-hidden="true" />
        </section>
        <section className="content-card water-day-summary">
          <h2>
            <Droplet size={21} aria-hidden="true" />
            Resumo do dia
          </h2>
          <dl>
            <div>
              <dt>
                <GlassWater size={23} aria-hidden="true" />
                Consumido
              </dt>
              <dd>{liters(consumed)}</dd>
            </div>
            <div>
              <dt>
                <Target size={23} aria-hidden="true" />
                Restante
              </dt>
              <dd>{liters(remaining)}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={23} aria-hidden="true" />
                Registros
              </dt>
              <dd>{summary.water_count}</dd>
            </div>
          </dl>
          {consumed === null && (
            <small>Sem consumo informado nesta data.</small>
          )}
        </section>
        {editable && (
          <section className="content-card water-register-card">
            <div className="water-bottle-light" aria-hidden="true" />
            <div>
              <h2>Registrar água</h2>
              <p>Adicione um novo consumo de forma rápida.</p>
              <DisclosureLink
                targetId="novo-registro"
                href={`${base}&registrar=1#novo-registro`}
                className="button-primary"
              >
                <Plus size={23} aria-hidden="true" />
                Registrar consumo
              </DisclosureLink>
            </div>
          </section>
        )}
      </div>
      <div className="water-content-grid">
        <section className="content-card water-week-card">
          <h2>
            <BarChart3 size={21} aria-hidden="true" />
            Consumo da semana
          </h2>
          <p className="field-hint">
            Sete dias até a data consultada. Dias sem registro não são consumo
            zero.
          </p>
          <div
            className="water-week-chart"
            role="list"
            aria-label="Consumo e meta por dia"
          >
            {days.map((day) => (
              <div
                key={day.date}
                role="listitem"
                className={day.date === date ? "water-chart-current" : ""}
              >
                <span className="water-chart-value">
                  {day.consumed === null ? "—" : liters(day.consumed)}
                </span>
                <div className="water-chart-track">
                  <span
                    className="water-chart-bar"
                    style={{
                      height: `${day.consumed === null ? 0 : (day.consumed / chartMax) * 100}%`,
                    }}
                  />
                  {day.goal !== null && (
                    <span
                      className="water-chart-goal"
                      style={{ bottom: `${(day.goal / chartMax) * 100}%` }}
                      title={`Meta de ${liters(day.goal)}`}
                    />
                  )}
                </div>
                <span className="water-chart-date">
                  {new Intl.DateTimeFormat("pt-BR", {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(day.date + "T12:00:00Z"))}
                  <small>
                    {day.date.slice(8)}/{day.date.slice(5, 7)}
                  </small>
                </span>
                <span className="sr-only">
                  {day.consumed === null
                    ? "Sem registros"
                    : `Consumido ${day.consumed} ml`}
                  ; {day.goal === null ? "sem meta" : `meta ${day.goal} ml`}
                </span>
              </div>
            ))}
          </div>
          <p className="water-chart-legend">
            Linha pontilhada: meta vigente em cada dia.
          </p>
        </section>
        <section className="content-card water-history">
          <header>
            <h2>
              <Clock3 size={21} aria-hidden="true" />
              {date === today() ? "Registro de hoje" : "Registros do dia"}
            </h2>
            <span>
              Total: <strong>{liters(consumed)}</strong>
            </span>
          </header>
          <div className="water-record-list">{rows.map(renderRecord)}</div>
          {!rows.length && (
            <p className="empty-state">
              Nenhum consumo registrado nesta página.
            </p>
          )}
          <nav className="pager" aria-label="Paginação dos registros de água">
            {page > 1 && (
              <Link href={`${base}&pagina=${page - 1}`}>Anteriores</Link>
            )}
            {hasMore && (
              <Link href={`${base}&pagina=${page + 1}`}>Próximos</Link>
            )}
          </nav>
        </section>
        <div className="water-tools">
          {editable && (
            <section className="content-card water-quick">
              <h2>
                <Zap size={21} aria-hidden="true" />
                Adicionar rapidamente
              </h2>
              <div>
                {[250, 500, 750, 1000].map((volume) => (
                  <Link
                    prefetch={false}
                    key={volume}
                    href={`${base}&registrar=1&volume=${volume}#novo-registro`}
                  >
                    <GlassWater size={24} aria-hidden="true" />
                    <span>{number(volume, 0)} ml</span>
                  </Link>
                ))}
              </div>
              <small>Escolha o volume e confirme o consumo.</small>
            </section>
          )}
          {editable ? (
            <ContainerManager containers={containers} />
          ) : (
            <Link
              className="content-card water-containers-link"
              href="/painel/agua/recipientes"
            >
              Gerenciar recipientes da conta
            </Link>
          )}
        </div>
      </div>
      {editable && (
        <>
          <DisclosureLink
            targetId="novo-registro"
            href={`${base}&registrar=1#novo-registro`}
            className="button-primary water-mobile-add"
          >
            <Plus size={25} aria-hidden="true" />
            Registrar água
          </DisclosureLink>
          <details
            id="novo-registro"
            key={`${date}-${preset ?? ""}`}
            open={registrar === "1"}
            className="content-card record-create water-create"
          >
            <summary>Adicionar consumo</summary>
            <p className="intro">
              Este registro será salvo no projeto ativo “{active?.name}”.
            </p>
            <WaterEntryForm
              initialRequestId={crypto.randomUUID()}
              date={date}
              min={selected.starts_on}
              max={max}
              preset={preset}
              containers={containers}
            />
          </details>
          <details id="meta-agua" className="content-card water-goal-form">
            <summary>Alterar meta de água</summary>
            <p>
              A alteração vale a partir da data escolhida; metas passadas
              permanecem preservadas.
            </p>
            <ActionForm
              action={changeWaterGoal}
              submit="Salvar meta de água"
              feedbackMode="modal"
            >
              <input type="hidden" name="project_id" value={selected.id} />
              <label>
                Vigência da meta
                <input
                  type="date"
                  name="effective_from"
                  min={
                    today() > selected.starts_on ? today() : selected.starts_on
                  }
                  max={selected.ends_on ?? undefined}
                  defaultValue={
                    today() > selected.starts_on ? today() : selected.starts_on
                  }
                  required
                />
              </label>
              <label>
                Meta diária (ml)
                <input
                  type="number"
                  name="target_ml"
                  min={100}
                  max={15000}
                  step={1}
                  defaultValue={goal ?? ""}
                  required
                />
              </label>
            </ActionForm>
          </details>
        </>
      )}
      <Link
        className="button-secondary water-general-history"
        href={`/painel/historico?data=${date}`}
      >
        Consultar histórico geral
      </Link>
    </div>
  );
}
