import { randomUUID } from "node:crypto";
import { apiAccount } from "@/lib/api-account";
import {
  stravaConfig,
  stravaHeaders,
  putStrava,
  stravaCookies,
} from "@/lib/strava-server";
import { siteUrl } from "@/lib/site-url";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: stravaHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: stravaHeaders });
  const config = stravaConfig();
  if (!config)
    return Response.json(
      { message: "Integração ainda não configurada." },
      { status: 503, headers: stravaHeaders },
    );
  const state = randomUUID();
  await putStrava(
    stravaCookies.state,
    { state, user: account.user.id, until: Date.now() + 600000 },
    "state",
    600,
  );
  const target = new URL("https://www.strava.com/oauth/authorize");
  target.search = new URLSearchParams({
    client_id: config.id,
    redirect_uri: `${config.origin}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  }).toString();
  return new Response(null, {
    status: 303,
    headers: { ...stravaHeaders, Location: target.toString() },
  });
}
