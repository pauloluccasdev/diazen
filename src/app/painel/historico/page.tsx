import { HistoryLink as Link } from "@/components/history-link";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ReturnLink } from "@/components/return-link";
import { projectContext } from "@/lib/data";
import { formatDate, isDate, number, today } from "@/lib/domain";
import {
  modules,
  categories,
  measurements,
  activityModality,
  units,
  type Entry,
} from "@/lib/records";
export const metadata = { title: "Histórico geral" };
export const dynamic = "force-dynamic";
const kinds = {
  ...modules,
  fotos: { title: "Fotografias privadas", table: "photos" },
};
type Kind = keyof typeof kinds;
type Record = Entry & { kind: Kind };
function description(row: Record) {
  if (row.kind === "agua")
    return `${number(row.volume_ml!, 0)} ml${row.container_label ? ` · ${row.container_label}` : ""}`;
  if (row.kind === "peso") return `${number(row.kg!, 2)} kg`;
  if (row.kind === "medidas")
    return `${measurements[row.measurement_type!]} · ${number(row.value_cm!, 2)} cm`;
  if (row.kind === "atividades")
    return `${row.name ? `${row.name} · ` : ""}${activityModality(row)} · ${number(row.duration_min!)} min${row.distance_km == null ? "" : ` · ${number(row.distance_km)} km`}${row.kcal == null ? "" : ` · ${number(row.kcal)} kcal`}${row.external_provider === "garmin" ? " · Garmin Connect" : ""}`;
  if (row.kind === "fotos") return "Fotografia privada";
  return `${row.name} · ${number(row.amount!, 3)} ${units[row.unit!]} · ${row.kcal == null ? "Calorias não informadas" : `${number((Number(row.kcal) * Number(row.amount)) / Number(row.reference_amount))} kcal`}`;
}
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    data?: string;
    mes?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const { client, active } = await projectContext();
  const date =
    params.data && isDate(params.data) && params.data <= today()
      ? params.data
      : today();
  const month =
    params.mes &&
    /^\d{4}-\d{2}$/.test(params.mes) &&
    isDate(`${params.mes}-01`) &&
    params.mes <= today().slice(0, 7)
      ? params.mes
      : date.slice(0, 7);
  const monthStart = new Date(`${month}-01T12:00:00Z`);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
  const shiftMonth = (offset: number) => {
    const d = new Date(monthStart);
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  };
  const length = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const firstWeekday = monthStart.getUTCDay();
  const page = Math.min(
    1000,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const needed = page * 20 + 1;
  const selectedKinds = Object.keys(kinds) as Kind[];
  const batches = !active
    ? []
    : await Promise.all(
        selectedKinds.map(async (kind) => {
          const rows: Record[] = [];
          for (let offset = 0; offset < needed; offset += 1000) {
            let query = client
              .from(kinds[kind].table)
              .select("*")
              .order("logged_on", { ascending: false })
              .order("id", { ascending: false })
              .range(offset, Math.min(offset + 999, needed - 1));
            query = query.eq("project_id", active!.id).eq("logged_on", date);
            const result = await query.returns<Entry[]>();
            if (result.error)
              throw Error(
                "Não foi possível carregar os registros do histórico.",
              );
            rows.push(...(result.data ?? []).map((row) => ({ ...row, kind })));
            if ((result.data?.length ?? 0) < Math.min(1000, needed - offset))
              break;
          }
          return rows;
        }),
      );
  const all = batches
    .flat()
    .sort(
      (a, b) =>
        b.logged_on.localeCompare(a.logged_on) ||
        b.id.localeCompare(a.id) ||
        a.kind.localeCompare(b.kind),
    );
  const rows = all.slice((page - 1) * 20, page * 20);
  const groups = [
    ...Object.entries(categories).map(([category, title]) => ({
      key: category,
      title,
      items: rows.filter(
        (r) => r.kind === "alimentacao" && r.category === category,
      ),
    })),
    ...selectedKinds
      .filter((kind) => kind !== "alimentacao")
      .map((kind) => ({
        key: kind,
        title: kinds[kind].title,
        items: rows.filter((r) => r.kind === kind),
      })),
  ].filter((group) => group.items.length);
  const href = (next: number) =>
    `/painel/historico?data=${date}&mes=${month}&pagina=${next}`;
  return (
    <div className="module-page history-page">
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <p className="eyebrow">SEU PERCURSO</p>
        <h1>
          Histórico geral<span className="accent">.</span>
        </h1>
        <p className="intro">
          Selecione um dia para consultar os registros do seu projeto ativo.
        </p>
      </section>
      {!active ? (
        <section className="content-card">
          <h2>Nenhum projeto ativo</h2>
          <p>
            Ative um projeto para consultar seu histórico diário. Os projetos
            anteriores continuam disponíveis em Projetos.
          </p>
          <Link className="button-secondary" href="/painel/projetos">
            Ver projetos
          </Link>
        </section>
      ) : (
        <>
          <p className="eyebrow">{active.name}</p>
          <section
            className="content-card history-calendar"
            aria-label="Calendário do histórico"
          >
            <header>
              <Link
                className="calendar-month"
                href={`/painel/historico?data=${date}&mes=${shiftMonth(-1)}`}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </Link>
              <h2>{monthLabel}</h2>
              {month < today().slice(0, 7) ? (
                <Link
                  className="calendar-month"
                  href={`/painel/historico?data=${date}&mes=${shiftMonth(1)}`}
                  aria-label="Próximo mês"
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </Link>
              ) : (
                <span className="calendar-month" aria-hidden="true" />
              )}
            </header>
            <div className="history-calendar-grid">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <span className="calendar-weekday" key={d}>
                  {d}
                </span>
              ))}
              {Array.from({ length: firstWeekday }, (_, i) => (
                <span key={`empty-${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, "0")}`;
                return day > today() ? (
                  <span className="calendar-future" key={day}>
                    {i + 1}
                  </span>
                ) : (
                  <Link
                    key={day}
                    href={`/painel/historico?data=${day}&mes=${month}`}
                    aria-label={`Consultar dia ${i + 1} de ${monthLabel}`}
                    aria-current={day === date ? "date" : undefined}
                  >
                    {i + 1}
                  </Link>
                );
              })}
            </div>
            <Link className="button-secondary" href="/painel/historico">
              Hoje
            </Link>
          </section>
          <details
            className="content-card history-selected-day"
            key={`${date}-${page}`}
            open
          >
            <summary>
              <span>
                <strong>{formatDate(date)}</strong>
                <small>
                  {rows.length} registros
                  {all.length > 20 ? " nesta página" : ""}
                </small>
              </span>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>
            <div className="history-day">
              {!rows.length && (
                <p className="intro">
                  Nenhum registro neste dia. Selecione outra data no calendário.
                </p>
              )}
              {groups.map((group) => (
                <details className="history-group" key={group.key}>
                  <summary>
                    <span>
                      <strong>{group.title}</strong>
                      <small>
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "registro" : "registros"}
                      </small>
                    </span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <ul>
                    {group.items.map((row) => (
                      <li key={`${row.kind}-${row.id}`}>
                        <Link
                          href={`/painel/${row.kind}?projeto=${active.id}${row.kind === "fotos" ? "" : `&data=${date}`}`}
                        >
                          <span>
                            <strong>{description(row)}</strong>
                          </span>
                          <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
          <nav className="panel-nav" aria-label="Paginação do histórico">
            {page > 1 && <Link href={href(page - 1)}>Anteriores</Link>}
            {all.length > page * 20 && (
              <Link href={href(page + 1)}>Próximos</Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
