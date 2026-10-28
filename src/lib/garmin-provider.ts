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
  startedAt?: string | null;
  imported?: boolean;
  removed?: boolean;
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
async function garminGet(key: string, path: string, transport: typeof fetch) {
  const options = {
    cache: "no-store" as const,
    redirect: "error" as const,
    signal: AbortSignal.timeout(15000),
  };
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
  try {
    return JSON.parse(
      await read(
        await transport(`${host}${path}`, {
          ...options,
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
  } catch (cause) {
    if (cause instanceof GarminFailure) throw cause;
    throw new GarminFailure("unavailable");
  }
}
function normalize(item: Record<string, unknown>): GarminActivity | null {
  const id = String(item.activityId);
  if (!/^\d{1,20}$/.test(id)) return null;
  const type = item.activityType as { typeKey?: unknown } | undefined;
  const utc =
    typeof item.startTimeGMT === "string" &&
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z?$/.test(
      item.startTimeGMT,
    )
      ? Date.parse(item.startTimeGMT.replace(" ", "T").replace(/Z$/, "") + "Z")
      : NaN;
  return {
    id,
    name:
      typeof item.activityName === "string" && item.activityName.trim()
        ? item.activityName.slice(0, 200)
        : "Atividade",
    sport:
      typeof type?.typeKey === "string"
        ? type.typeKey.slice(0, 60)
        : "Atividade",
    date:
      typeof item.startTimeLocal === "string"
        ? item.startTimeLocal.slice(0, 19)
        : "",
    seconds: n(item.duration),
    metres: n(item.distance),
    calories: n(item.calories),
    startedAt: Number.isFinite(utc) ? new Date(utc).toISOString() : null,
  };
}
export async function garminActivities(
  key: string,
  transport: typeof fetch = fetch,
  query: { start?: number; limit?: number; startDate?: string } = {},
): Promise<GarminActivity[]> {
  const limit = query.limit ?? 5;
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(query.start ?? 0) ||
    (query.start ?? 0) < 0 ||
    (query.start ?? 0) > 100000
  )
    throw new GarminFailure("unavailable");
  const params = new URLSearchParams({
    start: String(query.start ?? 0),
    limit: String(limit),
    sortOrder: "desc",
    sortBy: "startLocal",
    excludeChildren: "true",
  });
  if (query.startDate && /^\d{4}-\d{2}-\d{2}$/.test(query.startDate))
    params.set("startDate", query.startDate);
  const list = await garminGet(
    key,
    `/activitylist-service/activities/search/activities?${params}`,
    transport,
  );
  if (!Array.isArray(list)) throw new GarminFailure("unavailable");
  const seen = new Set<string>();
  return list.slice(0, limit).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const normalized = normalize(item);
    if (!normalized || seen.has(normalized.id)) return [];
    seen.add(normalized.id);
    return [normalized];
  });
}
export async function garminActivity(
  key: string,
  id: string,
  transport: typeof fetch = fetch,
): Promise<GarminActivity> {
  if (!/^\d{1,20}$/.test(id)) throw new GarminFailure("unavailable");
  const detail = await garminGet(
    key,
    `/activity-service/activity/${id}`,
    transport,
  );
  if (!detail || String(detail.activityId) !== id || !detail.summaryDTO)
    throw new GarminFailure("unavailable");
  const normalized = normalize({
    ...detail.summaryDTO,
    activityId: detail.activityId,
    activityName: detail.activityName,
    activityType: detail.activityTypeDTO,
  });
  if (!normalized) throw new GarminFailure("unavailable");
  return normalized;
}
export function garminModality(sport: string) {
  if (["strength_training"].includes(sport)) return "strength";
  if (
    [
      "running",
      "trail_running",
      "treadmill_running",
      "indoor_running",
      "track_running",
      "virtual_run",
    ].includes(sport)
  )
    return "running";
  if (
    [
      "cycling",
      "road_biking",
      "road_cycling",
      "indoor_cycling",
      "mountain_biking",
      "virtual_ride",
      "gravel_cycling",
      "e_bike_fitness",
    ].includes(sport)
  )
    return "cycling";
  if (["swimming", "lap_swimming", "open_water_swimming"].includes(sport))
    return "swimming";
  return "other";
}

export type GarminSleep = {
  date: string;
  total_seconds: number | null;
  nap_seconds: number | null;
  deep_seconds: number | null;
  light_seconds: number | null;
  rem_seconds: number | null;
  awake_seconds: number | null;
  score: number | null;
  started_at: string | null;
  ended_at: string | null;
};
function sleepInstant(value: unknown) {
  const time =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
        ? Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z")
        : NaN;
  return Number.isFinite(time) &&
    time > 0 &&
    Number.isFinite(new Date(time).getTime())
    ? new Date(time).toISOString()
    : null;
}
export async function garminSleep(
  key: string,
  from: string,
  to: string,
  transport: typeof fetch = fetch,
): Promise<GarminSleep[]> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    from > to ||
    Date.parse(to) - Date.parse(from) > 2 * 86400000
  )
    throw new GarminFailure("unavailable");
  const data = await garminGet(
    key,
    `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${from}&endDate=${to}`,
    transport,
  );
  if (!Array.isArray(data) || data.length > 10)
    throw new GarminFailure("unavailable");
  const result: GarminSleep[] = [];
  for (const item of data) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.calendarDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.calendarDate) ||
      item.calendarDate < from ||
      item.calendarDate > to
    )
      continue;
    const calendarTime = Date.parse(item.calendarDate + "T12:00:00Z");
    if (
      !Number.isFinite(calendarTime) ||
      new Date(calendarTime).toISOString().slice(0, 10) !== item.calendarDate
    )
      continue;
    const seconds = (v: unknown) => {
      const value = n(v);
      return value !== null && Number.isInteger(value) && value <= 86400
        ? value
        : null;
    };
    const overall = item.sleepScores?.overall;
    const score = n(overall?.value);
    const record: GarminSleep = {
      date: item.calendarDate,
      total_seconds: seconds(item.sleepTimeSeconds),
      nap_seconds: seconds(item.napTimeSeconds),
      deep_seconds: seconds(item.deepSleepSeconds),
      light_seconds: seconds(item.lightSleepSeconds),
      rem_seconds: seconds(item.remSleepSeconds),
      awake_seconds: seconds(item.awakeSleepSeconds),
      score:
        overall?.qualifierKey !== "INVALID" &&
        score !== null &&
        Number.isInteger(score) &&
        score <= 100
          ? score
          : null,
      started_at: sleepInstant(item.sleepStartTimestampGMT),
      ended_at: sleepInstant(item.sleepEndTimestampGMT),
    };
    if (
      item.sleepWindowConfirmed === true ||
      record.score !== null ||
      Object.values(record).some((v) => typeof v === "number" && v > 0)
    )
      result.push(record);
  }
  return result;
}
