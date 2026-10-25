import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { garminActivities, GarminFailure } from "@/lib/garmin-provider";
import { siteUrl } from "@/lib/site-url";
import { createHash } from "node:crypto";
import type { GarminActivity } from "@/lib/garmin-provider";

export const runtime = "nodejs";
export const maxDuration = 60;
// A brief, private cache deduplicates refreshes instead of rejecting the user.
let recent: {
  identity: string;
  expires: number;
  result: Promise<GarminActivity[]>;
} | null = null;
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: garminHeaders });
  const account = await apiAccount();
  if (!account)
    return Response.json(
      { message: "Entre na sua conta para consultar." },
      { status: 401, headers: garminHeaders },
    );
  const config = garminConfig(account.user.id);
  if (!config)
    return Response.json(
      { message: "Consulta Garmin indisponível para esta conta." },
      { status: 403, headers: garminHeaders },
    );
  try {
    const identity = createHash("sha256")
      .update(`${account.user.id}:${config.key}`)
      .digest("hex");
    if (
      !recent ||
      recent.identity !== identity ||
      recent.expires <= Date.now()
    ) {
      const entry = {
        identity,
        expires: Date.now() + 60000,
        result: garminActivities(config.key),
      };
      recent = entry;
      const cleanup = () => {
        if (recent === entry) recent = null;
      };
      void entry.result.catch(cleanup);
      setTimeout(cleanup, 60000).unref();
    }
    return Response.json(
      { activities: await recent.result },
      { headers: garminHeaders },
    );
  } catch (cause) {
    const reason =
      cause instanceof GarminFailure ? cause.reason : "unavailable";
    return Response.json(
      {
        message:
          reason === "unauthorized"
            ? "A chave Garmin expirou ou foi revogada. Atualize a chave da integração."
            : reason === "rate_limit"
              ? "A Garmin limitou as consultas. Aguarde alguns minutos e tente novamente."
              : "Não foi possível consultar a Garmin agora. Tente novamente.",
      },
      {
        status:
          reason === "unauthorized" ? 409 : reason === "rate_limit" ? 429 : 502,
        headers: garminHeaders,
      },
    );
  }
}
