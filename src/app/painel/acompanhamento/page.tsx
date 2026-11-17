import Link from "next/link";
import { ReturnLink } from "@/components/return-link";
import { CheckinForm } from "@/components/daily/checkin-form";
import { EatingContextForm } from "@/components/daily/eating-context-form";
import { ActionForm } from "@/components/forms/action-form";
import { projectContext } from "@/lib/data";
import { today, isDate, formatDate, number } from "@/lib/domain";
import {
  checkinScales,
  reflectionFields,
  eatingContexts,
  type DailyCheckin,
  type EatingContext,
} from "@/lib/daily-followup";
import { categories } from "@/lib/records";
import { deleteDailyRecord } from "./actions";
export const metadata = { title: "Meu check-in" };
export default async function Followup({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string; pagina?: string }>;
}) {
  const params = await searchParams,
    { selected, active, client } = await projectContext(params.projeto);
  if (!selected)
    return (
      <section className="content-card">
        <h1>Meu check-in</h1>
        <Link href="/painel/projetos">Criar ou ativar projeto</Link>
      </section>
    );
  const date =
    params.data && isDate(params.data) && params.data <= today()
      ? params.data
      : today();
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.pagina) || 1)),
  );
  const [checkin, contexts] = await Promise.all([
    client
      .from("daily_checkins")
      .select("*")
      .eq("project_id", selected.id)
      .eq("logged_on", date)
      .maybeSingle<DailyCheckin>(),
    client
      .from("eating_context_events")
      .select("*")
      .eq("project_id", selected.id)
      .eq("logged_on", date)
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20)
      .returns<EatingContext[]>(),
  ]);
  if (checkin.error || contexts.error)
    throw Error("Não foi possível carregar o acompanhamento.");
  const editable =
    selected.id === active?.id &&
    selected.status === "ACTIVE" &&
    date >= selected.starts_on &&
    (!selected.ends_on || date <= selected.ends_on);
  const max =
      selected.ends_on && selected.ends_on < today()
        ? selected.ends_on
        : today(),
    row = checkin.data,
    events = contexts.data ?? [];
  return (
    <div className="module-page daily-followup-page">
      <section className="welcome">
        <ReturnLink href={`/painel?projeto=${selected.id}&data=${date}`}>
          Voltar ao dashboard
        </ReturnLink>
        <p className="eyebrow">
          {selected.name} · {formatDate(date)}
        </p>
        <h1>Como foi meu dia?</h1>
        <p>
          Um espaço para perceber sua rotina, sem julgamento. Você não precisa
          completar dias anteriores.
        </p>
        <Link href={`/painel/historico?data=${date}`}>
          Escolher outra data no histórico
        </Link>
      </section>
      {!editable && (
        <p className="readonly-note">
          Consulta somente leitura nesta data/projeto.
        </p>
      )}
      <section className="content-card" aria-label="Check-in diário">
        <h2>Recuperação e reflexão</h2>
        <p>
          As horas informadas por você não substituem o sono da Garmin. Cada
          fonte mantém seu registro.
        </p>
        {row ? (
          <>
            <dl className="daily-perceptions">
              <div>
                <dt>Sono informado</dt>
                <dd>
                  {row.sleep_hours == null
                    ? "Não informado"
                    : `${number(row.sleep_hours, 2)} h`}
                </dd>
              </div>
              {Object.entries(checkinScales).map(([key, scale]) => (
                <div key={key}>
                  <dt>{scale.label}</dt>
                  <dd>
                    {row[key as keyof typeof checkinScales] === null
                      ? "Não informado"
                      : scale.options[row[key as keyof typeof checkinScales]!]}
                  </dd>
                </div>
              ))}
            </dl>
            {Object.entries(reflectionFields).map(
              ([key, label]) =>
                row[key as keyof typeof reflectionFields] && (
                  <div className="daily-note" key={key}>
                    <strong>{label}</strong>
                    <p>{row[key as keyof typeof reflectionFields]}</p>
                  </div>
                ),
            )}
          </>
        ) : (
          <p>Ainda não há check-in para esta data.</p>
        )}
        {editable && (
          <details open>
            <summary>{row ? "Revisar check-in" : "Fazer meu check-in"}</summary>
            <CheckinForm
              key={date}
              date={date}
              min={selected.starts_on}
              max={max}
              initial={row}
            />
          </details>
        )}
        {editable && row && (
          <details>
            <summary>Excluir check-in</summary>
            <ActionForm
              action={deleteDailyRecord}
              submit="Excluir check-in"
              feedbackMode="modal"
            >
              <input type="hidden" name="kind" value="daily_checkins" />
              <input type="hidden" name="id" value={row.id} />
              <label className="checkbox-label">
                <input type="checkbox" name="confirm" required />
                Confirmo excluir o check-in desta data.
              </label>
            </ActionForm>
          </details>
        )}
      </section>
      <section className="content-card" aria-label="Contexto alimentar">
        <h2>Alimentação e contexto</h2>
        <p>
          Refeições sociais fazem parte da rotina. Registre o que quiser
          observar, sem compensações ou classificação de alimentos.
        </p>
        {editable && (
          <details>
            <summary>Adicionar contexto alimentar</summary>
            <EatingContextForm date={date} min={selected.starts_on} max={max} />
          </details>
        )}
        {!events.length && <p>Sem contextos registrados nesta data.</p>}
        <div className="daily-context-list">
          {events.slice(0, 20).map((event) => (
            <article key={event.id}>
              <h3>{eatingContexts[event.context]}</h3>
              {event.category && (
                <p>{categories[event.category as keyof typeof categories]}</p>
              )}
              <p>
                Fome: {event.hunger ?? "não informada"} · Saciedade:{" "}
                {event.satiety ?? "não informada"}
              </p>
              {event.triggers && <p>Contexto: {event.triggers}</p>}
              {event.notes && <p>{event.notes}</p>}
              {editable && (
                <details>
                  <summary>Excluir contexto</summary>
                  <ActionForm
                    action={deleteDailyRecord}
                    submit="Excluir contexto"
                    feedbackMode="modal"
                  >
                    <input
                      type="hidden"
                      name="kind"
                      value="eating_context_events"
                    />
                    <input type="hidden" name="id" value={event.id} />
                    <label className="checkbox-label">
                      <input type="checkbox" name="confirm" required />
                      Confirmo excluir este contexto.
                    </label>
                  </ActionForm>
                </details>
              )}
            </article>
          ))}
        </div>
        <nav aria-label="Paginação dos contextos">
          {page > 1 && (
            <Link
              href={`?projeto=${selected.id}&data=${date}&pagina=${page - 1}`}
            >
              Anteriores
            </Link>
          )}
          {events.length > 20 && (
            <Link
              href={`?projeto=${selected.id}&data=${date}&pagina=${page + 1}`}
            >
              Próximos
            </Link>
          )}
        </nav>
      </section>
    </div>
  );
}
