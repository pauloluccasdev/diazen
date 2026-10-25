export class GarminFailure extends Error {
  reason: "unauthorized" | "rate_limit" | "unavailable";
  constructor(reason: "unauthorized" | "rate_limit" | "unavailable") {
    super(reason);
    this.reason = reason;
  }
}
export type GarminActivity = {
  id: string;
  name: string;
  sport: string;
  date: string;
  seconds: number | null;
  metres: number | null;
  calories: number | null;
};
const host = "https://personal.connectapi.garmin.com";
async function read(response: Response) {
  if (!response.ok)
    throw new GarminFailure(
      response.status === 401 || response.status === 403
        ? "unauthorized"
        : response.status === 429
          ? "rate_limit"
          : "unavailable",
    );
  // Bound the stream as well as Content-Length; never log upstream bodies.
  const reader = response.body?.getReader();
  if (!reader) throw new GarminFailure("unavailable");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new GarminFailure("unavailable");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}
function n(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
export async function garminActivities(
  key: string,
  transport: typeof fetch = fetch,
): Promise<GarminActivity[]> {
  const options = {
    cache: "no-store" as const,
    redirect: "error" as const,
    signal: AbortSignal.timeout(15000),
  };
  // The documented Personal token endpoint returns a JWT as text/plain.
  const token = (
    await read(
      await transport(
        `${host}/personalapitoken-service/personal-api/personal-api-key/token`,
        {
          ...options,
          method: "POST",
          headers: { Authorization: `ApiKey ${key}` },
        },
      ),
    )
  ).trim();
  if (token.length > 16000 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token))
    throw new GarminFailure("unavailable");
  const raw = await read(
    await transport(
      `${host}/activitylist-service/activities/search/activities?start=0&limit=5&sortOrder=desc&sortBy=startLocal&excludeChildren=true`,
      { ...options, headers: { Authorization: `Bearer ${token}` } },
    ),
  );
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    throw new GarminFailure("unavailable");
  }
  if (!Array.isArray(list)) throw new GarminFailure("unavailable");
  const seen = new Set<string>();
  return list.slice(0, 5).flatMap((item): GarminActivity[] => {
    if (!item || typeof item !== "object") return [];
    const id = String(item.activityId);
    if (!/^\d{1,20}$/.test(id) || seen.has(id)) return [];
    seen.add(id);
    return [
      {
        id,
        name:
          typeof item.activityName === "string"
            ? item.activityName.slice(0, 200)
            : "Atividade",
        sport:
          typeof item.activityType?.typeKey === "string"
            ? item.activityType.typeKey.slice(0, 60)
            : "Atividade",
        date:
          typeof item.startTimeLocal === "string"
            ? item.startTimeLocal.slice(0, 19)
            : "",
        seconds: n(item.duration),
        metres: n(item.distance),
        calories: n(item.calories),
      },
    ];
  });
}
