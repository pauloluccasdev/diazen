export class StravaFailure extends Error {
  reason: "unauthorized" | "rate_limit" | "unavailable";
  constructor(reason: "unauthorized" | "rate_limit" | "unavailable") {
    super(reason);
    this.reason = reason;
  }
}
type Transport = typeof fetch;
async function read(response: Response) {
  if (!response.ok)
    throw new StravaFailure(
      response.status === 401 || response.status === 403
        ? "unauthorized"
        : response.status === 429
          ? "rate_limit"
          : "unavailable",
    );
  const raw = await response.text();
  if (raw.length > 1_000_000) throw new StravaFailure("unavailable");
  return JSON.parse(raw);
}
export async function stravaToken(
  clientId: string,
  clientSecret: string,
  grant: { code: string } | { refresh_token: string },
  transport: Transport = fetch,
) {
  const data = await read(
    await transport("https://www.strava.com/oauth/token", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "code" in grant ? "authorization_code" : "refresh_token",
        ...grant,
      }),
    }),
  );
  if (
    typeof data.access_token !== "string" ||
    typeof data.refresh_token !== "string" ||
    data.access_token.length > 1000 ||
    data.refresh_token.length > 1000 ||
    !Number.isFinite(data.expires_at)
  )
    throw new StravaFailure("unavailable");
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at as number,
  };
}
export type StravaActivity = {
  id: string;
  name: string;
  sport: string;
  date: string;
  seconds: number | null;
  metres: number | null;
  calories: number | null;
};
function n(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
export async function stravaActivities(
  token: string,
  transport: Transport = fetch,
): Promise<StravaActivity[]> {
  const get = async (path: string) =>
    read(
      await transport(`https://www.strava.com/api/v3/${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  const list = await get("athlete/activities?per_page=5&page=1");
  if (!Array.isArray(list)) throw new StravaFailure("unavailable");
  const ids = [...new Set(list.slice(0, 5).map((item) => String(item.id)))];
  return Promise.all(
    ids.map(async (id): Promise<StravaActivity> => {
      if (!/^\d{1,20}$/.test(id)) throw new StravaFailure("unavailable");
      const detail = await get(`activities/${id}`);
      if (String(detail.id) !== id) throw new StravaFailure("unavailable");
      return {
        id,
        name:
          typeof detail.name === "string"
            ? detail.name.slice(0, 200)
            : "Atividade",
        sport:
          typeof detail.sport_type === "string"
            ? detail.sport_type.slice(0, 60)
            : "Atividade",
        date:
          typeof detail.start_date_local === "string"
            ? detail.start_date_local.slice(0, 19)
            : "",
        seconds: n(detail.moving_time),
        metres: n(detail.distance),
        calories: n(detail.calories),
      };
    }),
  );
}

export async function revokeStrava(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  transport: Transport = fetch,
) {
  const response = await transport("https://www.strava.com/oauth/revoke", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  });
  if (!response.ok) throw new StravaFailure("unavailable");
}
