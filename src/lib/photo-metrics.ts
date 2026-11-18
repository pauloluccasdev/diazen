export const photoPoses = {
  front: "Frente",
  side: "Lateral",
  back: "Costas",
  other: "Outras",
} as const;
export type PhotoPose = keyof typeof photoPoses;
export interface PhotoMetadata {
  id: string;
  project_id: string;
  logged_on: string;
  category: PhotoPose;
}
export function photoOverview(
  rows: PhotoMetadata[],
  date: string,
  startsOn: string,
) {
  const photos = rows
    .filter((photo) => photo.logged_on <= date)
    .toSorted(
      (a, b) =>
        b.logged_on.localeCompare(a.logged_on) || b.id.localeCompare(a.id),
    );
  const dates = new Map<string, PhotoMetadata[]>();
  for (const photo of photos) {
    const group = dates.get(photo.logged_on);
    if (group) group.push(photo);
    else dates.set(photo.logged_on, [photo]);
  }
  const latest = photos[0] ?? null;
  const elapsed = latest
    ? Math.floor(
        (Date.parse(latest.logged_on + "T12:00:00Z") -
          Date.parse(startsOn + "T12:00:00Z")) /
          86400000,
      ) + 1
    : null;
  const positions = Object.entries(photoPoses).map(([key, label]) => {
    const entries = photos.filter((photo) => photo.category === key);
    return {
      key: key as PhotoPose,
      label,
      count: entries.length,
      latest: entries[0] ?? null,
    };
  });
  return {
    photos,
    latest,
    projectDay: elapsed !== null && elapsed >= 1 ? elapsed : null,
    count: photos.length,
    dateCount: dates.size,
    positions,
    timeline: [...dates].map(([logged_on, entries]) => ({
      logged_on,
      photos: entries,
      count: entries.length,
      poses: Object.keys(photoPoses).filter((key) =>
        entries.some((photo) => photo.category === key),
      ) as PhotoPose[],
    })),
  };
}
export function suggestedPhotoPair(rows: PhotoMetadata[], pose?: PhotoPose) {
  const positions = pose ? [pose] : (Object.keys(photoPoses) as PhotoPose[]);
  for (const key of positions) {
    const entries = rows
      .filter((row) => row.category === key)
      .toSorted(
        (a, b) =>
          b.logged_on.localeCompare(a.logged_on) || b.id.localeCompare(a.id),
      );
    if (entries.length >= 2) return [entries.at(-1)!, entries[0]];
  }
  return [];
}
export function photoComparisonValues(
  left: string,
  right: string,
  weights: { logged_on: string; kg: number | string | null }[],
  waist: { logged_on: string; value_cm: number | string | null }[],
) {
  function comparison(
    a: number | string | null | undefined,
    b: number | string | null | undefined,
  ) {
    const first = a == null ? null : Number(a),
      second = b == null ? null : Number(b);
    return {
      first,
      second,
      difference: first !== null && second !== null ? second - first : null,
    };
  }
  return {
    weight: comparison(
      weights.find((row) => row.logged_on === left)?.kg,
      weights.find((row) => row.logged_on === right)?.kg,
    ),
    waist: comparison(
      waist.find((row) => row.logged_on === left)?.value_cm,
      waist.find((row) => row.logged_on === right)?.value_cm,
    ),
  };
}
export type PhotoOverview = ReturnType<typeof photoOverview>;
export type PhotoComparisonValues = ReturnType<typeof photoComparisonValues>;
