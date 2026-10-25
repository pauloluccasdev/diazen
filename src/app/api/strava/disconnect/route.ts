import { apiAccount } from "@/lib/api-account";
import { siteUrl } from "@/lib/site-url";
import {
  stravaHeaders,
  stravaSession,
  clearStrava,
  stravaConfig,
} from "@/lib/strava-server";
import { revokeStrava } from "@/lib/strava-provider";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: stravaHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: stravaHeaders });
  const session = await stravaSession(account.user.id);
  let revoked = false;
  try {
    const config = stravaConfig();
    if (session && config) {
      await revokeStrava(config.id, config.secret, session.refresh_token);
      revoked = true;
    }
  } catch {
    revoked = false;
  }
  await clearStrava();
  return Response.json(
    {
      message: revoked
        ? "Strava desconectado deste navegador. A autorização foi removida."
        : "Conexão removida deste navegador. Não foi possível confirmar a revogação; remova o acesso também nas configurações do Strava.",
    },
    { headers: stravaHeaders },
  );
}
