import "server-only";
import { cookies } from "next/headers";
import { siteUrl } from "./site-url";
import { sealStrava, openStrava } from "./strava-crypto";
export const stravaCookies = {
  state: "diazen-strava-state",
  session: "diazen-strava-session",
};
export type StravaSession = {
  user: string;
  until: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};
export function stravaConfig() {
  const id = process.env.STRAVA_CLIENT_ID,
    secret = process.env.STRAVA_CLIENT_SECRET,
    origin = siteUrl();
  return id && /^\d+$/.test(id) && secret && origin
    ? { id, secret, origin }
    : null;
}
export const stravaHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};
export async function putStrava(
  name: string,
  data: unknown,
  purpose: "state" | "session",
  maxAge: number,
) {
  const config = stravaConfig();
  if (!config) throw Error("Integração indisponível");
  (await cookies()).set(
    name,
    sealStrava(data, purpose, config.id, config.secret),
    {
      httpOnly: true,
      secure: config.origin.startsWith("https:"),
      sameSite: "lax",
      path: "/",
      maxAge,
    },
  );
}
export async function getStrava(purpose: "state" | "session") {
  const config = stravaConfig();
  if (!config) return null;
  return openStrava(
    (await cookies()).get(stravaCookies[purpose])?.value,
    purpose,
    config.id,
    config.secret,
  );
}
export async function stravaSession(
  user: string,
): Promise<StravaSession | null> {
  const raw = await getStrava("session");
  if (!raw || typeof raw !== "object") return null;
  const s = raw as StravaSession;
  return s.user === user &&
    Number.isFinite(s.until) &&
    s.until > Date.now() &&
    typeof s.access_token === "string" &&
    typeof s.refresh_token === "string" &&
    Number.isFinite(s.expires_at)
    ? s
    : null;
}
export async function clearStrava() {
  const store = await cookies();
  for (const name of Object.values(stravaCookies))
    store.set(name, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: siteUrl()?.startsWith("https:") ?? false,
      maxAge: 0,
    });
}
