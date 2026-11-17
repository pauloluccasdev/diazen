import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { siteUrl } from "@/lib/site-url";
import { syncGarminSleep } from "@/lib/garmin-sleep-sync";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: garminHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: garminHeaders });
  if (!garminConfig(account.user.id))
    return new Response(null, { status: 403, headers: garminHeaders });
  let enabled: boolean | undefined;
  try {
    const raw = await request.text();
    if (raw.length > 100) throw Error();
    const body = JSON.parse(raw);
    if (typeof body.enabled === "boolean") {
      enabled = body.enabled;
      const saved = await account.client.rpc("set_garmin_sleep_sync", {
        p_enabled: enabled,
      });
      if (saved.error)
        return Response.json(
          { message: "Não foi possível alterar a sincronização do sono." },
          { status: 503, headers: garminHeaders },
        );
    } else if (body.check !== true) throw Error();
  } catch {
    return Response.json(
      { message: "Informe uma opção válida." },
      { status: 400, headers: garminHeaders },
    );
  }
  if (enabled === false) {
    revalidatePath("/painel", "layout");
    return Response.json(
      { enabled: false, updated: 0, checked: false },
      { headers: garminHeaders },
    );
  }
  try {
    const result = await syncGarminSleep(account.user.id);
    revalidatePath("/painel", "layout");
    return Response.json(
      { ...result, ...(enabled === undefined ? {} : { enabled }) },
      { headers: garminHeaders },
    );
  } catch {
    revalidatePath("/painel", "layout");
    return Response.json(
      {
        enabled,
        message: enabled
          ? "Sincronização ativada. A consulta à Garmin falhou agora; uma nova tentativa será feita automaticamente."
          : "Não foi possível consultar o sono agora. Seus registros anteriores foram preservados.",
      },
      { status: enabled ? 200 : 503, headers: garminHeaders },
    );
  }
}
