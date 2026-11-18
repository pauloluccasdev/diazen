import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { photoComparisonValues, type PhotoMetadata } from "./photo-metrics";
export async function photoMetadata(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const rows: PhotoMetadata[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("photos")
      .select("id,project_id,logged_on,category")
      .eq("project_id", project)
      .lte("logged_on", date)
      .order("logged_on", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 999)
      .returns<PhotoMetadata[]>();
    if (error) throw Error("Não foi possível carregar sua galeria privada.");
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}
export async function photoChanges(
  client: SupabaseClient,
  project: string,
  photos: PhotoMetadata[],
) {
  if (photos.length !== 2) return null;
  const dates = [...new Set(photos.map((photo) => photo.logged_on))];
  const [weights, waist] = await Promise.all([
    client
      .from("weights")
      .select("logged_on,kg")
      .eq("project_id", project)
      .in("logged_on", dates)
      .returns<{ logged_on: string; kg: number | string | null }[]>(),
    client
      .from("measurements")
      .select("logged_on,value_cm")
      .eq("project_id", project)
      .eq("measurement_type", "waist")
      .in("logged_on", dates)
      .returns<{ logged_on: string; value_cm: number | string | null }[]>(),
  ]);
  if (weights.error || waist.error)
    throw Error(
      "Não foi possível consultar as medições das datas selecionadas.",
    );
  return photoComparisonValues(
    photos[0].logged_on,
    photos[1].logged_on,
    weights.data ?? [],
    waist.data ?? [],
  );
}
