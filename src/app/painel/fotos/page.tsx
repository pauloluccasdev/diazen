import Image from "next/image";
import Link from "next/link";
import { projectContext } from "@/lib/data";
import { formatDate, isId, today } from "@/lib/domain";
import { PhotoUploader } from "@/components/photo-uploader";
import { ActionForm } from "@/components/forms/action-form";
import { deletePhoto } from "./actions";
export const metadata = { title: "Fotografias privadas" };
const poses: Record<string, string> = {
  front: "Frente",
  back: "Costas",
  side: "Lateral",
  other: "Outras",
};
interface Photo {
  id: string;
  project_id: string;
  logged_on: string;
  category: string;
}
export default async function Photos({
  searchParams,
}: {
  searchParams: Promise<{
    projeto?: string;
    categoria?: string;
    pagina?: string;
    a?: string;
    b?: string;
  }>;
}) {
  const params = await searchParams,
    { client, selected, active } = await projectContext(params.projeto);
  if (!selected)
    return (
      <section className="welcome">
        <h1>Suas fotografias.</h1>
        <Link className="button-primary" href="/painel/projetos">
          Configurar projeto
        </Link>
      </section>
    );
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const page = Math.min(
      10000,
      Math.max(1, Math.floor(Number(params.pagina) || 1)),
    ),
    category =
      params.categoria && Object.hasOwn(poses, params.categoria)
        ? params.categoria
        : "";
  let query = client
    .from("photos")
    .select("*")
    .eq("project_id", selected.id)
    .order("logged_on", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 12, page * 12);
  if (category) query = query.eq("category", category);
  const { data, error } = await query.returns<Photo[]>();
  if (error) throw new Error("Falha na galeria");
  const rows = (data ?? []).slice(0, 12),
    hasMore = (data?.length ?? 0) > 12;
  const comparison: Photo[] = [];
  for (const id of [params.a, params.b])
    if (id && isId(id)) {
      const { data, error } = await client
        .from("photos")
        .select("*")
        .eq("id", id)
        .eq("project_id", selected.id)
        .maybeSingle<Photo>();
      if (error) throw new Error("Falha na comparação");
      if (data) comparison.push(data);
    }
  const link = (p: number) =>
    `/painel/fotos?projeto=${selected.id}&pagina=${p}${category ? `&categoria=${category}` : ""}${params.a && isId(params.a) ? `&a=${params.a}` : ""}${params.b && isId(params.b) ? `&b=${params.b}` : ""}`;
  const choices = [
    ...rows,
    ...comparison.filter((photo) => !rows.some((row) => row.id === photo.id)),
  ];
  return (
    <>
      <section className="welcome">
        <Link className="back-link" href={`/painel?projeto=${selected.id}`}>
          ← Dashboard
        </Link>
        <p className="eyebrow">{selected.name}</p>
        <h1>Suas fotografias.</h1>
        <p className="intro">Um registro visual da sua evolução, só seu.</p>
      </section>
      {!editable && (
        <p className="readonly-note">
          Projeto somente leitura.{" "}
          {active && (
            <Link href={`/painel/fotos?projeto=${active.id}`}>
              Enviar no projeto ativo →
            </Link>
          )}
        </p>
      )}
      {editable && (
        <details className="content-card">
          <summary>Adicionar foto</summary>
          <PhotoUploader
            min={selected.starts_on}
            max={
              selected.ends_on && selected.ends_on < today()
                ? selected.ends_on
                : today()
            }
          />
        </details>
      )}
      <form className="filter-form">
        <input type="hidden" name="projeto" value={selected.id} />
        <label>
          Categoria
          <select name="categoria" defaultValue={category}>
            <option value="">Todas</option>
            {Object.entries(poses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button-primary">Filtrar</button>
      </form>
      <section className="content-card">
        <h2>Comparar fotos</h2>
        <p className="intro">
          Escolha preferencialmente a mesma categoria para comparar.
        </p>
        <form className="filter-form">
          <input type="hidden" name="projeto" value={selected.id} />
          {category && (
            <input type="hidden" name="categoria" value={category} />
          )}
          <input type="hidden" name="pagina" value={page} />
          {["a", "b"].map((key, i) => (
            <label key={key}>
              Foto {i + 1}
              <select
                name={key}
                required
                defaultValue={params[key as "a" | "b"] ?? ""}
              >
                <option value="">Selecione nesta página</option>
                {choices.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {formatDate(photo.logged_on)} · {poses[photo.category]} ·{" "}
                    {photo.id.slice(0, 4)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="button-primary">Comparar</button>
        </form>
        {comparison.length === 2 && (
          <>
            {comparison[0].category !== comparison[1].category && (
              <p className="intro">
                As fotos selecionadas têm categorias diferentes.
              </p>
            )}
            <div className="comparison-grid">
              {comparison.map((photo, index) => (
                <figure key={`${index}-${photo.id}`}>
                  <Image
                    unoptimized
                    src={`/api/fotos/${photo.id}`}
                    width={1600}
                    height={1600}
                    alt={`${poses[photo.category]} em ${formatDate(photo.logged_on)}`}
                  />
                  <figcaption>
                    {poses[photo.category]} · {formatDate(photo.logged_on)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="photo-grid" aria-label="Galeria privada">
        {rows.map((photo) => (
          <article className="content-card" key={photo.id}>
            <Image
              unoptimized
              src={`/api/fotos/${photo.id}?miniatura=1`}
              width={360}
              height={360}
              loading="lazy"
              alt={`${poses[photo.category]} em ${formatDate(photo.logged_on)}`}
            />
            <h2>{poses[photo.category]}</h2>
            <p className="muted">{formatDate(photo.logged_on)}</p>
            <nav
              className="panel-nav"
              aria-label="Selecionar foto para comparação"
            >
              <Link
                href={`${link(page).replace(/&a=[^&]+/, "")}&a=${photo.id}`}
              >
                Usar como foto 1
              </Link>
              <Link
                href={`${link(page).replace(/&b=[^&]+/, "")}&b=${photo.id}`}
              >
                Usar como foto 2
              </Link>
            </nav>
            {editable && (
              <details>
                <summary>Excluir foto</summary>
                <ActionForm action={deletePhoto} submit="Excluir foto">
                  <input type="hidden" name="id" value={photo.id} />
                  <label className="checkbox-label">
                    <input type="checkbox" name="confirm" required />
                    Confirmo a exclusão desta foto.
                  </label>
                </ActionForm>
              </details>
            )}
          </article>
        ))}
      </section>
      {!rows.length && <p className="intro">Nenhuma foto nesta consulta.</p>}
      <nav className="panel-nav" aria-label="Paginação da galeria">
        {page > 1 && <Link href={link(page - 1)}>Anteriores</Link>}
        {hasMore && <Link href={link(page + 1)}>Próximas</Link>}
      </nav>
    </>
  );
}
