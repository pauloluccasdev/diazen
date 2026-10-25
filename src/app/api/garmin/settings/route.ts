import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { siteUrl } from "@/lib/site-url";
export const runtime = "nodejs";
export async function GET() {
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: garminHeaders });
  if (!garminConfig(account.user.id))
    return new Response(null, { status: 403, headers: garminHeaders });
  const { data, error } = await account.client
    .from("garmin_sync_settings")
    .select("enabled,auto_after,last_success_at")
    .eq("user_id", account.user.id)
    .maybeSingle();
  if (error) return new Response(null, { status: 503, headers: garminHeaders });
  return Response.json(
    data ?? { enabled: true, auto_after: null, last_success_at: null },
    { headers: garminHeaders },
  );
}
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return new Response(null, { status: 403, headers: garminHeaders });
  const account = await apiAccount();
  if (!account)
    return new Response(null, { status: 401, headers: garminHeaders });
  if (!garminConfig(account.user.id))
    return new Response(null, { status: 403, headers: garminHeaders });
  try {
    const raw = await request.text();
    if (raw.length > 100) throw Error();
    const body = JSON.parse(raw);
    if (typeof body.enabled !== "boolean") throw Error();
    const { data, error } = await account.client
      .from("garmin_sync_settings")
      .update({ enabled: body.enabled })
      .eq("user_id", account.user.id)
      .select("enabled")
      .maybeSingle();
    if (error || !data) throw Error();
    return Response.json({ enabled: data.enabled }, { headers: garminHeaders });
  } catch {
    return Response.json(
      { message: "Não foi possível alterar a sincronização. Tente novamente." },
      { status: 400, headers: garminHeaders },
    );
  }
}
