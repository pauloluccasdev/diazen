import "./photos.css";
import Image from "next/image";
import Link from "next/link";
import Form from "next/form";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Images,
  Plus,
  Ruler,
  Scale,
  ShieldCheck,
  Trash2,
  ArrowLeftRight,
  ImageIcon,
} from "lucide-react";
import { ModuleContext } from "@/components/shell/module-context";
import { ModuleHeading } from "@/components/shell/module-heading";
import { DisclosureLink } from "@/components/disclosure-link";
import { ActionDisclosure } from "@/components/action-disclosure";
import { ActionForm } from "@/components/forms/action-form";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoImage } from "./photo-image";
import { PhotoCardMenu } from "./photo-card-menu";
import { deletePhoto } from "@/app/painel/fotos/actions";
import { formatDate, number, today, type Project } from "@/lib/domain";
import {
  photoPoses,
  type PhotoPose,
  type PhotoMetadata,
  type PhotoOverview,
  type PhotoComparisonValues,
} from "@/lib/photo-metrics";
export type PhotoView = "galeria" | "comparar" | "linha-do-tempo";
function shortDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(date.slice(0, 4) !== today().slice(0, 4)
      ? { year: "numeric" as const }
      : {}),
  }).format(new Date(date + "T12:00:00Z"));
}
export function PhotoDiary({
  projects,
  selected,
  active,
  date,
  category,
  day,
  view,
  page,
  overview,
  filtered,
  days,
  selectedA,
  selectedB,
  choices,
  changes,
  uploadOpen,
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  category: PhotoPose | "";
  day: string | undefined;
  view: PhotoView;
  page: number;
  overview: PhotoOverview;
  filtered: PhotoMetadata[];
  days: PhotoOverview["timeline"];
  selectedA: PhotoMetadata | null;
  selectedB: PhotoMetadata | null;
  choices: PhotoMetadata[];
  changes: PhotoComparisonValues | null;
  uploadOpen: boolean;
}) {
  const editable = selected.status === "ACTIVE" && selected.id === active?.id;
  const max =
    selected.ends_on && selected.ends_on < today() ? selected.ends_on : today();
  const rows = filtered.slice((page - 1) * 4, page * 4),
    timeline = days.slice((page - 1) * 12, page * 12);
  function href(values: Record<string, string | undefined> = {}) {
    const query = new URLSearchParams({
      projeto: selected.id,
      data: date,
      vista: view,
      ...(category ? { categoria: category } : {}),
      ...(day ? { dia: day } : {}),
      ...(selectedA ? { a: selectedA.id } : {}),
      ...(selectedB ? { b: selectedB.id } : {}),
    });
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === "") query.delete(key);
      else query.set(key, value);
    }
    return `/painel/fotos?${query}`;
  }
  const register = (
    <DisclosureLink
      className="button-primary"
      href={`${href({ enviar: "1" })}#adicionar-foto`}
      targetId="adicionar-foto"
    >
      <Plus size={20} aria-hidden="true" />
      Adicionar fotos
    </DisclosureLink>
  );
  const comparison =
    selectedA && selectedB && selectedA.id !== selectedB.id
      ? [selectedA, selectedB]
      : [];
  function dateRow(group: PhotoOverview["timeline"][number]) {
    return (
      <Link
        key={group.logged_on}
        prefetch={false}
        className="photo-date-row"
        href={href({
          vista: "galeria",
          dia: group.logged_on,
          pagina: undefined,
        })}
      >
        <Image
          unoptimized
          src={`/api/fotos/${group.photos[0].id}?miniatura=1`}
          width={100}
          height={120}
          alt=""
        />
        <span>
          <strong>{formatDate(group.logged_on)}</strong>
          <small>
            {group.poses.map((pose) => photoPoses[pose]).join(", ")} ·{" "}
            {group.count} {group.count === 1 ? "foto" : "fotos"}
          </small>
        </span>
        <ChevronRight size={21} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <div className={`module-page photo-diary photo-view-${view}`}>
      <ModuleContext
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path="/painel/fotos"
      />
      <ModuleHeading
        title="Fotos de evolução"
        description="Seu histórico visual, privado e organizado por data."
        project={selected}
        date={date}
        path="/painel/fotos"
        query={{
          vista: view,
          ...(category ? { categoria: category } : {}),
          ...(selectedA ? { a: selectedA.id } : {}),
          ...(selectedB ? { b: selectedB.id } : {}),
        }}
        action={editable ? register : undefined}
      />
      {!editable && (
        <p className="readonly-note">
          {selected.status === "DRAFT"
            ? "Rascunhos não recebem registros."
            : "Projeto somente leitura."}
          {active && (
            <>
              {" "}
              <Link
                prefetch={false}
                href={`/painel/fotos?projeto=${active.id}`}
              >
                Enviar no projeto ativo →
              </Link>
            </>
          )}
        </p>
      )}
      <nav className="photo-tabs" aria-label="Visualização das fotografias">
        {(
          [
            ["galeria", "Galeria"],
            ["comparar", "Comparar"],
            ["linha-do-tempo", "Linha do tempo"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            prefetch={false}
            href={href({ vista: key, pagina: undefined, dia: undefined })}
            aria-current={view === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {date !== today() && (
        <p className="photo-query-date">Consulta até {formatDate(date)}</p>
      )}
      <div className="photo-summary-grid">
        <section
          className="content-card photo-latest"
          aria-label="Última fotografia na consulta"
        >
          <span className="photo-summary-icon">
            <CalendarDays size={25} aria-hidden="true" />
          </span>
          <div>
            <span>Última foto</span>
            <strong>
              {overview.latest
                ? shortDate(overview.latest.logged_on)
                : "Nenhuma fotografia"}
            </strong>
            <small>
              {overview.projectDay
                ? `${overview.projectDay}º dia do projeto`
                : "Seu registro visual começa aqui."}
            </small>
          </div>
        </section>
        <section className="content-card photo-count">
          <span className="photo-summary-icon">
            <Images size={25} aria-hidden="true" />
          </span>
          <div>
            <span>Registros fotográficos</span>
            <strong>
              {overview.count} {overview.count === 1 ? "foto" : "fotos"}
            </strong>
            <small>
              {overview.dateCount}{" "}
              {overview.dateCount === 1
                ? "data registrada"
                : "datas registradas"}{" "}
              · até {formatDate(date)}
            </small>
          </div>
        </section>
      </div>
      <div className="photo-main-grid">
        <section className="content-card photo-positions">
          <h2>Fotos por posição</h2>
          <nav aria-label="Posição das fotografias">
            {overview.positions.map((position) => (
              <Link
                key={position.key}
                prefetch={false}
                href={href({ categoria: position.key, pagina: undefined })}
                aria-current={category === position.key ? "true" : undefined}
              >
                <span className="photo-position-image">
                  {position.latest ? (
                    <Image
                      unoptimized
                      src={`/api/fotos/${position.latest.id}?miniatura=1`}
                      width={120}
                      height={160}
                      alt=""
                    />
                  ) : (
                    <ImageIcon size={25} aria-hidden="true" />
                  )}
                </span>
                <span>
                  <strong>{position.label}</strong>
                  <small>
                    {position.count} {position.count === 1 ? "foto" : "fotos"}
                  </small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <Link
            className="photo-all-positions"
            prefetch={false}
            href={href({
              categoria: undefined,
              pagina: undefined,
            })}
          >
            Todas as posições
          </Link>
        </section>
        {view === "galeria" && (
          <section className="photo-recent-dates">
            <header>
              <h2>Últimos registros</h2>
              <Link
                prefetch={false}
                href={href({
                  vista: "linha-do-tempo",
                  pagina: undefined,
                  dia: undefined,
                })}
              >
                Ver todos <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </header>
            {days.slice(0, 2).map(dateRow)}
            {!days.length && <p>Nenhuma fotografia registrada.</p>}
          </section>
        )}
        {view === "linha-do-tempo" && (
          <section className="content-card photo-timeline">
            <h2>Linha do tempo</h2>
            <p className="field-hint">
              Datas reais e posições registradas. As fotografias não são usadas
              para estimar composição corporal.
            </p>
            {timeline.map(dateRow)}
            {!timeline.length && <p>Nenhuma fotografia nesta consulta.</p>}
            <nav
              className="photo-pagination"
              aria-label="Paginação da linha do tempo"
            >
              {page > 1 && (
                <Link
                  prefetch={false}
                  href={href({ pagina: String(page - 1) })}
                >
                  Anteriores
                </Link>
              )}
              {page * 12 < days.length && (
                <Link
                  prefetch={false}
                  href={href({ pagina: String(page + 1) })}
                >
                  Próximas
                </Link>
              )}
            </nav>
          </section>
        )}
        {editable && <div className="photo-mobile-add">{register}</div>}
        {view === "galeria" && (
          <section
            className="photo-gallery-section"
            aria-label="Galeria privada"
          >
            <header>
              <h2>
                {day
                  ? `Fotos de ${formatDate(day)}`
                  : category
                    ? `Últimos registros — ${photoPoses[category]}`
                    : "Últimos registros"}
              </h2>
              <Link
                prefetch={false}
                href={href({
                  vista: "linha-do-tempo",
                  pagina: undefined,
                  dia: undefined,
                })}
              >
                Ver todos <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </header>
            <div className="photo-grid">
              {rows.map((photo) => (
                <article key={photo.id} className="photo-record">
                  <PhotoImage photo={photo} />
                  <div className="photo-record-caption">
                    <h3>{photoPoses[photo.category]}</h3>
                    <time dateTime={photo.logged_on}>
                      {shortDate(photo.logged_on)}
                    </time>
                  </div>
                  <PhotoCardMenu
                    label={`Gerenciar foto ${photoPoses[photo.category]} de ${formatDate(photo.logged_on)}`}
                  >
                    {" "}
                    <nav
                      className="photo-selection"
                      aria-label="Selecionar foto para comparação"
                    >
                      <Link prefetch={false} href={href({ a: photo.id })}>
                        Usar como foto 1
                      </Link>
                      <Link prefetch={false} href={href({ b: photo.id })}>
                        Usar como foto 2
                      </Link>
                    </nav>
                    {editable && (
                      <ActionDisclosure
                        title="Excluir foto"
                        icon={Trash2}
                        className="record-action destructive-action"
                      >
                        <ActionForm action={deletePhoto} submit="Excluir foto">
                          <input type="hidden" name="id" value={photo.id} />
                          <label className="checkbox-label">
                            <input type="checkbox" name="confirm" required />
                            Confirmo a exclusão desta foto.
                          </label>
                        </ActionForm>
                      </ActionDisclosure>
                    )}
                  </PhotoCardMenu>
                </article>
              ))}
            </div>
            {!rows.length && (
              <div className="content-card photo-empty">
                <Camera size={35} aria-hidden="true" />
                <h3>Nenhuma foto nesta consulta</h3>
                <p>
                  As fotografias enviadas por você aparecerão aqui, com acesso
                  privado.
                </p>
              </div>
            )}
            <nav className="photo-pagination" aria-label="Paginação da galeria">
              {page > 1 && (
                <Link
                  prefetch={false}
                  href={href({ pagina: String(page - 1) })}
                >
                  Anteriores
                </Link>
              )}
              {page * 4 < filtered.length && (
                <Link
                  prefetch={false}
                  href={href({ pagina: String(page + 1) })}
                >
                  Próximas
                </Link>
              )}
            </nav>
          </section>
        )}
      </div>
      <div className="photo-bottom-grid">
        <section className="content-card photo-comparison">
          <header>
            <div>
              <h2>Comparativo</h2>
              {comparison.length === 2 && (
                <p>
                  {formatDate(comparison[0].logged_on)} ×{" "}
                  {formatDate(comparison[1].logged_on)}
                </p>
              )}
            </div>
            {comparison.length === 2 && (
              <Link
                prefetch={false}
                className="photo-swap"
                aria-label="Trocar ordem das fotografias"
                href={href({ a: comparison[1].id, b: comparison[0].id })}
              >
                <ArrowLeftRight size={20} aria-hidden="true" />
              </Link>
            )}
          </header>
          <details
            className="photo-comparison-controls"
            open={view === "comparar" || comparison.length !== 2}
          >
            <summary>Escolher fotos para comparar</summary>
            <p className="field-hint">
              Prefira a mesma posição. Cada fotografia mantém sua data e
              identificação.
            </p>
            <Form
              prefetch={false}
              action="/painel/fotos"
              className="filter-form"
            >
              <input type="hidden" name="projeto" value={selected.id} />
              <input type="hidden" name="data" value={date} />
              <input type="hidden" name="vista" value={view} />
              <input type="hidden" name="pagina" value={page} />
              {category && (
                <input type="hidden" name="categoria" value={category} />
              )}
              {day && <input type="hidden" name="dia" value={day} />}
              {(
                [
                  ["a", selectedA],
                  ["b", selectedB],
                ] as const
              ).map(([key, value], i) => (
                <label key={key}>
                  Foto {i + 1}
                  <select
                    name={key}
                    required
                    disabled={!choices.length}
                    defaultValue={value?.id ?? ""}
                  >
                    <option value="">Selecione uma fotografia</option>
                    {choices.map((photo, index) => (
                      <option key={photo.id} value={photo.id}>
                        {formatDate(photo.logged_on)} ·{" "}
                        {photoPoses[photo.category]} · registro {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="submit"
                className="button-primary"
                disabled={choices.length < 2}
              >
                Comparar
              </button>
            </Form>
          </details>
          {selectedA && selectedB && selectedA.id === selectedB.id && (
            <p className="intro">
              Escolha duas fotografias diferentes para comparar.
            </p>
          )}
          {comparison.length === 2 ? (
            <>
              {comparison[0].category !== comparison[1].category && (
                <p className="intro">
                  As fotos selecionadas têm categorias diferentes.
                </p>
              )}
              {comparison.some((photo) => photo.logged_on > date) && (
                <p className="intro">
                  A comparação inclui uma fotografia posterior à data
                  consultada.
                </p>
              )}
              <div className="comparison-grid">
                {comparison.map((photo, i) => (
                  <figure key={`${i}-${photo.id}`}>
                    <PhotoImage photo={photo} thumbnail={false} />
                    <figcaption>
                      {photoPoses[photo.category]} ·{" "}
                      {formatDate(photo.logged_on)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <div className="photo-comparison-empty">
              <Images size={35} aria-hidden="true" />
              <p>
                {choices.length < 2
                  ? "São necessárias duas fotografias para comparar."
                  : "Selecione duas fotografias para visualizar lado a lado."}
              </p>
            </div>
          )}
        </section>
        <section className="content-card photo-changes">
          <h2>Registros nas datas</h2>
          {changes && comparison.length === 2 ? (
            <>
              {(
                [
                  ["Peso", "kg", changes.weight, Scale],
                  ["Cintura", "cm", changes.waist, Ruler],
                ] as const
              ).map(([label, unit, values, Icon]) => (
                <div className="photo-change-row" key={label}>
                  <Icon size={23} aria-hidden="true" />
                  <div>
                    <h3>{label}</h3>
                    <p>
                      {values.first === null
                        ? "Sem registro"
                        : `${number(values.first, 2)} ${unit}`}{" "}
                      →{" "}
                      {values.second === null
                        ? "Sem registro"
                        : `${number(values.second, 2)} ${unit}`}
                    </p>
                  </div>
                  {values.difference !== null && (
                    <strong>
                      {values.difference > 0 ? "+" : ""}
                      {number(values.difference, 2)} {unit}
                    </strong>
                  )}
                </div>
              ))}
              <p className="field-hint">
                Medições registradas nas duas datas exatas. Ausência não é zero
                e não é estimada pela fotografia.
              </p>
            </>
          ) : (
            <p>
              Escolha duas fotografias para consultar peso e cintura registrados
              nas respectivas datas.
            </p>
          )}
          <p className="photo-no-composition">
            Composição corporal: sem avaliação registrada.
          </p>
        </section>
      </div>
      <div className="photo-extras">
        <details className="photo-filter-controls">
          <summary>Filtrar galeria</summary>
          <Form prefetch={false} action="/painel/fotos" className="filter-form">
            <input type="hidden" name="projeto" value={selected.id} />
            <input type="hidden" name="data" value={date} />
            <input type="hidden" name="vista" value={view} />
            <label>
              Categoria
              <select name="categoria" defaultValue={category}>
                <option value="">Todas</option>
                {Object.entries(photoPoses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-secondary" type="submit">
              Filtrar
            </button>
          </Form>
        </details>
        <p className="photo-privacy">
          <ShieldCheck size={16} aria-hidden="true" />
          Fotografias privadas, acessíveis somente à sua conta.
        </p>
      </div>
      {editable && (
        <details
          id="adicionar-foto"
          className="content-card photo-upload"
          open={uploadOpen}
        >
          <summary>
            <Camera size={20} aria-hidden="true" />
            Adicionar foto
          </summary>
          <p className="intro">
            As fotografias serão salvas no projeto ativo “{active?.name}”.
          </p>
          <PhotoUploader
            min={selected.starts_on}
            max={max}
            date={day ?? date}
          />
        </details>
      )}
    </div>
  );
}
