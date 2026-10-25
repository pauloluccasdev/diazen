import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { garminActivities, GarminFailure } from "@/lib/garmin-provider";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 60;
let nextRequest = 0;
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
  if (Date.now() < nextRequest)
    return Response.json(
      { message: "Aguarde um minuto antes de atualizar novamente." },
      { status: 429, headers: { ...garminHeaders, "Retry-After": "60" } },
    );
  nextRequest = Date.now() + 60000;
  try {
    return Response.json(
      { activities: await garminActivities(config.key) },
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
              : "Não foi possível consultar a Garmin agora. Tente novamente em um minuto.",
      },
      {
        status:
          reason === "unauthorized" ? 409 : reason === "rate_limit" ? 429 : 502,
        headers: garminHeaders,
      },
    );
  }
}
