import { timingSafeEqual } from "node:crypto";
import { apiAccount } from "@/lib/api-account";
import { garminConfig, garminHeaders } from "@/lib/garmin-config";
import { syncGarminSleep } from "@/lib/garmin-sleep-sync";
import { syncGarmin } from "@/lib/garmin-sync";
import { siteUrl } from "@/lib/site-url";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.GARMIN_SYNC_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = secret && secret.length >= 32 ? `Bearer ${secret}` : "";
  const cron = Boolean(
    expected &&
    Buffer.byteLength(authorization) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(authorization), Buffer.from(expected)),
  );
  let user: string;
  if (cron) {
    user = process.env.GARMIN_OWNER_USER_ID ?? "";
  } else {
    if (!siteUrl() || request.headers.get("origin") !== siteUrl())
      return new Response(null, { status: 403, headers: garminHeaders });
    const account = await apiAccount();
    if (!account)
      return new Response(null, { status: 401, headers: garminHeaders });
    user = account.user.id;
  }
  if (!garminConfig(user))
    return new Response(null, { status: 403, headers: garminHeaders });
  try {
    const [activity, sleep] = await Promise.allSettled([
      syncGarmin(user),
      syncGarminSleep(user),
    ]);
    if (
      activity.status === "rejected" &&
      (sleep.status === "rejected" || !sleep.value.checked)
    )
      throw Error("Integração indisponível");
    const result =
      activity.status === "fulfilled"
        ? activity.value
        : { imported: 0, review: 0, paused: false, pending: false };
    const sleepResult =
      sleep.status === "fulfilled"
        ? sleep.value
        : { updated: 0, checked: false, revision: null };
    if (result.imported || sleepResult.checked)
      revalidatePath("/painel", "layout");
    return Response.json(
      {
        ...result,
        sleep_updated: sleepResult.updated,
        sleep_checked: sleepResult.checked,
        sleep_revision: sleepResult.revision,
        sleep_unavailable: sleep.status === "rejected",
        activities_unavailable: activity.status === "rejected",
      },
      { headers: garminHeaders },
    );
  } catch {
    return Response.json(
      {
        message:
          "Não foi possível sincronizar a Garmin agora. Uma nova tentativa será feita automaticamente.",
      },
      { status: 502, headers: garminHeaders },
    );
  }
}
