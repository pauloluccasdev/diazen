import Link from "next/link";
import { projectContext } from "@/lib/data";
import { isDate, isId, today } from "@/lib/domain";
import { photoMetadata, photoChanges } from "@/lib/photo-data";
import {
  photoOverview,
  photoPoses,
  suggestedPhotoPair,
  type PhotoMetadata,
  type PhotoPose,
} from "@/lib/photo-metrics";
import { PhotoDiary, type PhotoView } from "@/components/photos/photo-diary";
export const metadata = { title: "Fotografias privadas" };
export default async function Photos({
  searchParams,
}: {
  searchParams: Promise<{
    projeto?: string;
    categoria?: string;
    pagina?: string;
    a?: string;
    b?: string;
    data?: string;
    dia?: string;
    vista?: string;
    enviar?: string;
  }>;
}) {
  const params = await searchParams;
  const { client, selected, active, projects } = await projectContext(
    params.projeto,
  );
  if (!selected)
    return (
      <section className="welcome">
        <h1>Fotos de evolução</h1>
        <p className="intro">
          Crie e ative seu primeiro projeto para começar sua galeria privada.
        </p>
        <Link
          className="button-primary"
          prefetch={false}
          href="/painel/projetos"
        >
          Configurar projeto
        </Link>
      </section>
    );
  const date = params.data && isDate(params.data) ? params.data : today();
  const category =
    params.categoria && Object.hasOwn(photoPoses, params.categoria)
      ? (params.categoria as PhotoPose)
      : "";
  const day = params.dia && isDate(params.dia) ? params.dia : undefined;
  const view: PhotoView =
    params.vista === "comparar" || params.vista === "linha-do-tempo"
      ? params.vista
      : "galeria";
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.pagina) || 1)),
  );
  const overview = photoOverview(
    await photoMetadata(client, selected.id, date),
    date,
    selected.starts_on,
  );
  const filtered = overview.photos.filter(
    (photo) =>
      (!category || photo.category === category) &&
      (!day || photo.logged_on === day),
  );
  const days = photoOverview(filtered, date, selected.starts_on).timeline;
  let selectedA: PhotoMetadata | null = null,
    selectedB: PhotoMetadata | null = null;
  if (params.a || params.b) {
    const requested = await Promise.all(
      [params.a, params.b].map(async (id) => {
        if (!id || !isId(id)) return null;
        const { data, error } = await client
          .from("photos")
          .select("id,project_id,logged_on,category")
          .eq("id", id)
          .eq("project_id", selected.id)
          .maybeSingle<PhotoMetadata>();
        if (error)
          throw Error("Não foi possível carregar a comparação privada.");
        return data;
      }),
    );
    [selectedA, selectedB] = requested;
  } else {
    const pair = suggestedPhotoPair(filtered, category || undefined);
    selectedA = pair[0] ?? null;
    selectedB = pair[1] ?? null;
  }
  const comparison =
    selectedA && selectedB && selectedA.id !== selectedB.id
      ? [selectedA, selectedB]
      : [];
  const changes = await photoChanges(client, selected.id, comparison);
  const choices = [
    ...new Map(
      [
        ...overview.photos,
        ...comparison,
        ...(selectedA ? [selectedA] : []),
        ...(selectedB ? [selectedB] : []),
      ].map((photo) => [photo.id, photo]),
    ).values(),
  ];
  return (
    <PhotoDiary
      projects={projects}
      selected={selected}
      active={active}
      date={date}
      category={category}
      day={day}
      view={view}
      page={page}
      overview={overview}
      filtered={filtered}
      days={days}
      selectedA={selectedA}
      selectedB={selectedB}
      choices={choices}
      changes={changes}
      uploadOpen={params.enviar === "1"}
    />
  );
}
