import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { ReturnLink } from "@/components/return-link";
import { projectContext } from "@/lib/data";
import {
  formatDate,
  isDate,
  number,
  statusLabel,
  today,
  type Project,
} from "@/lib/domain";
import {
  modules,
  isModule,
  categories,
  measurements,
  modalities,
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
    return `${modalities[row.modality!]} · ${number(row.duration_min!)} min${row.distance_km == null ? "" : ` · ${number(row.distance_km)} km`}`;
  if (row.kind === "fotos") return "Fotografia privada";
  return `${row.name} · ${number(row.amount!, 3)} ${units[row.unit!]} · ${row.kcal == null ? "Calorias não informadas" : `${number((Number(row.kcal) * Number(row.amount)) / Number(row.reference_amount))} kcal`}`;
}
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    projeto?: string;
    tipo?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const project =
    params.projeto && params.projeto !== "todos" ? params.projeto : undefined;
  const { client } = await projectContext(project);
  const projects: Project[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 999)
      .returns<Project[]>();
    if (result.error)
      throw Error("Não foi possível carregar os projetos do histórico.");
    projects.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) break;
  }
  const validType =
    !params.tipo ||
    params.tipo === "todos" ||
    isModule(params.tipo) ||
    params.tipo === "fotos";
  const invalid =
    !validType ||
    (params.de && (!isDate(params.de) || params.de > today())) ||
    (params.ate && (!isDate(params.ate) || params.ate > today())) ||
    (params.de && params.ate && params.de > params.ate);
  const page = Math.min(
    1000,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const needed = page * 20 + 1;
  const selectedKinds = Object.keys(kinds).filter(
    (kind) => !params.tipo || params.tipo === "todos" || kind === params.tipo,
  ) as Kind[];
  const batches = invalid
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
            if (project) query = query.eq("project_id", project);
            if (params.de) query = query.gte("logged_on", params.de);
            if (params.ate) query = query.lte("logged_on", params.ate);
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
  const dates = [...new Set(rows.map((row) => row.logged_on))];
  const href = (next: number) => {
    const search = new URLSearchParams();
    for (const key of ["projeto", "tipo", "de", "ate"] as const)
      if (params[key]) search.set(key, params[key]);
    search.set("pagina", String(next));
    return `/painel/historico?${search}`;
  };
  return (
    <div className="module-page history-page">
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <p className="eyebrow">SEU PERCURSO</p>
        <h1>
          Histórico geral<span className="accent">.</span>
        </h1>
        <p className="intro">
          Consulte alimentação, hidratação, atividades, peso, medidas e fotos em
          um só lugar.
        </p>
      </section>
      <form
        className="filter-form history-filters"
        key={[
          project ?? "todos",
          params.tipo ?? "todos",
          params.de ?? "",
          params.ate ?? "",
          page,
        ].join("|")}
      >
        <label>
          Projeto
          <select name="projeto" defaultValue={project ?? "todos"}>
            <option value="todos">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {statusLabel[p.status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de registro
          <select
            name="tipo"
            defaultValue={validType ? (params.tipo ?? "todos") : "todos"}
          >
            <option value="todos">Todos os registros</option>
            {Object.entries(kinds).map(([kind, config]) => (
              <option key={kind} value={kind}>
                {config.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          De (opcional)
          <input
            type="date"
            name="de"
            defaultValue={isDate(params.de ?? "") ? params.de : ""}
            max={today()}
          />
        </label>
        <label>
          Até (opcional)
          <input
            type="date"
            name="ate"
            defaultValue={isDate(params.ate ?? "") ? params.ate : ""}
            max={today()}
          />
        </label>
        <button className="button-primary">Consultar histórico</button>
        <Link className="button-secondary" href="/painel/historico">
          Limpar filtros
        </Link>
      </form>
      {invalid ? (
        <p className="form-error" role="alert">
          Confira o tipo e as datas. O início deve ser anterior ou igual ao fim
          e não pode haver datas futuras.
        </p>
      ) : (
        <>
          <p className="field-hint">
            Consulta do histórico. Os registros novos continuam destinados ao
            projeto ativo. As fotos permanecem privadas e abrem na galeria.
          </p>
          {!rows.length && (
            <section className="content-card">
              <History size={24} aria-hidden="true" />
              <h2>Nenhum registro encontrado</h2>
              <p>Experimente outro período, projeto ou tipo de registro.</p>
            </section>
          )}
          {dates.map((date) => (
            <section
              className="history-day content-card"
              key={date}
              aria-label={`Registros de ${formatDate(date)}`}
            >
              <h2>{formatDate(date)}</h2>
              <ul>
                {rows
                  .filter((row) => row.logged_on === date)
                  .map((row) => (
                    <li key={`${row.kind}-${row.id}`}>
                      <Link
                        href={`/painel/${row.kind}?projeto=${row.project_id}${row.kind === "fotos" ? "" : `&data=${row.logged_on}`}`}
                      >
                        <span>
                          <small>
                            {kinds[row.kind].title} ·{" "}
                            {
                              projects.find((p) => p.id === row.project_id)
                                ?.name
                            }
                            {row.kind === "alimentacao" && row.category
                              ? ` · ${categories[row.category]}`
                              : ""}
                          </small>
                          <strong>{description(row)}</strong>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
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
