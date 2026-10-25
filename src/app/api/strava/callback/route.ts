import { cookies } from "next/headers";
import { apiAccount } from "@/lib/api-account";
import { siteUrl } from "@/lib/site-url";
import { stravaToken } from "@/lib/strava-provider";
import {
  stravaConfig,
  stravaHeaders,
  getStrava,
  putStrava,
  stravaCookies,
} from "@/lib/strava-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const config = stravaConfig(),
    origin = siteUrl();
  if (!config || !origin)
    return new Response(null, { status: 503, headers: stravaHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, {
      status: 303,
      headers: { ...stravaHeaders, Location: `${origin}/entrar` },
    });
  const params = new URL(request.url).searchParams;
  const state = (await getStrava("state")) as {
    user?: string;
    state?: string;
    until?: number;
  } | null;
  (await cookies()).set(stravaCookies.state, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https:"),
    maxAge: 0,
  });
  let result = "cancelled";
  if (
    state?.user === account.user.id &&
    typeof state.until === "number" &&
    state.until > Date.now() &&
    state.state === params.get("state") &&
    params.get("code") &&
    params
      .get("scope")
      ?.split(/[\s,]+/)
      .includes("activity:read_all") &&
    !params.has("error")
  ) {
    try {
      const token = await stravaToken(config.id, config.secret, {
        code: params.get("code")!,
      });
      const until = Date.now() + 7 * 86400000;
      await putStrava(
        stravaCookies.session,
        { ...token, user: account.user.id, until },
        "session",
        7 * 86400,
      );
      result = "connected";
    } catch {
      result = "failed";
    }
  }
  return new Response(null, {
    status: 303,
    headers: {
      ...stravaHeaders,
      Location: `${origin}/painel/atividades?strava=${result}#strava`,
    },
  });
}
