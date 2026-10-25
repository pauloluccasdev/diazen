import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { garminActivity } from "@/lib/garmin-provider";
import { persistGarmin } from "@/lib/garmin-sync";
import { siteUrl } from "@/lib/site-url";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: garminHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: garminHeaders });
  const config = garminConfig(account.user.id);
  if (!config)
    return new Response(null, { status: 403, headers: garminHeaders });
  let ids: string[];
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw Error();
    const body = JSON.parse(raw);
    if (
      !Array.isArray(body.ids) ||
      body.ids.length < 1 ||
      body.ids.length > 5 ||
      body.ids.some(
        (id: unknown) => typeof id !== "string" || !/^\d{1,20}$/.test(id),
      )
    )
      throw Error();
    ids = [...new Set<string>(body.ids)];
  } catch {
    return Response.json(
      { message: "Selecione até cinco atividades válidas." },
      { status: 400, headers: garminHeaders },
    );
  }
  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const activity = await garminActivity(config.key, id);
          return {
            externalId: id,
            ...(await persistGarmin(account.user.id, activity)),
          };
        } catch {
          return { externalId: id, status: "unavailable" };
        }
      }),
    );
    revalidatePath("/painel", "layout");
    return Response.json(
      {
        results,
        message:
          "Seleção processada. As atividades importadas estão no diário.",
      },
      { headers: garminHeaders },
    );
  } catch {
    return Response.json(
      {
        message:
          "Não foi possível importar. Confira sua conexão e tente novamente.",
      },
      { status: 502, headers: garminHeaders },
    );
  }
}
