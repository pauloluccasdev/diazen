import { apiAccount } from "@/lib/api-account";
import { siteUrl } from "@/lib/site-url";
import {
  stravaConfig,
  stravaHeaders,
  stravaSession,
  putStrava,
  stravaCookies,
  clearStrava,
} from "@/lib/strava-server";
import {
  stravaActivities,
  stravaToken,
  StravaFailure,
} from "@/lib/strava-provider";
export const runtime = "nodejs";
export const maxDuration = 60;
const lastRead = new Map<string, number>();
export async function GET() {
  const account = await apiAccount();
  if (!account)
    return Response.json(
      { message: "Entre novamente." },
      { status: 401, headers: stravaHeaders },
    );
  return Response.json(
    {
      configured: !!stravaConfig(),
      connected: !!(await stravaSession(account.user.id)),
    },
    { headers: stravaHeaders },
  );
}
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: stravaHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: stravaHeaders });
  const config = stravaConfig();
  let session = await stravaSession(account.user.id);
  if (!config || !session)
    return Response.json(
      { message: "Conecte sua conta Strava para consultar." },
      { status: 409, headers: stravaHeaders },
    );
  const now = Date.now();
  if ((lastRead.get(account.user.id) ?? 0) > now)
    return Response.json(
      { message: "Aguarde um minuto antes de atualizar." },
      { status: 429, headers: stravaHeaders },
    );
  for (const [id, until] of lastRead) if (until <= now) lastRead.delete(id);
  lastRead.set(account.user.id, now + 60000);
  try {
    if (session.expires_at * 1000 < now + 60000) {
      const fresh = await stravaToken(config.id, config.secret, {
        refresh_token: session.refresh_token,
      });
      session = { ...session, ...fresh };
      await putStrava(
        stravaCookies.session,
        session,
        "session",
        Math.max(1, Math.floor((session.until - now) / 1000)),
      );
    }
    const activities = await stravaActivities(session.access_token);
    return Response.json({ activities }, { headers: stravaHeaders });
  } catch (error) {
    if (error instanceof StravaFailure && error.reason === "unauthorized") {
      await clearStrava();
      return Response.json(
        {
          message:
            "A autorização do Strava expirou ou foi revogada. Conecte novamente.",
        },
        { status: 409, headers: stravaHeaders },
      );
    }
    const limited =
      error instanceof StravaFailure && error.reason === "rate_limit";
    return Response.json(
      {
        message: limited
          ? "O limite de consultas do Strava foi atingido. Tente mais tarde."
          : "O Strava não respondeu. Tente novamente mais tarde.",
      },
      { status: limited ? 429 : 502, headers: stravaHeaders },
    );
  }
}
