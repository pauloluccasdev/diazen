import "server-only";
import { createAdminClient } from "./supabase/admin";
import { garminConfig } from "./garmin-config";
import {
  garminActivities,
  garminModality,
  type GarminActivity,
} from "./garmin-provider";
export async function persistGarmin(
  user: string,
  activity: GarminActivity,
  lease: string | null = null,
) {
  const admin = createAdminClient();
  if (!admin) throw Error("Integração indisponível");
  const { data, error } = await admin.rpc("garmin_import_activity", {
    p_user: user,
    p_data: { ...activity, modality: garminModality(activity.sport) },
    p_lease: lease,
  });
  if (error)
    throw Error("Não foi possível salvar a atividade. Tente novamente.");
  return data as { status: string; id?: string | null };
}
export async function syncGarmin(user: string) {
  const config = garminConfig(user),
    admin = createAdminClient();
  if (!config || !admin) throw Error("Integração indisponível");
  const claimed = await admin.rpc("garmin_claim_sync", { p_user: user });
  if (claimed.error) throw Error("Não foi possível iniciar a sincronização.");
  if (!claimed.data)
    return { imported: 0, review: 0, paused: true, pending: false };
  const claim = claimed.data as {
    lease: string;
    after: string;
    offset: number;
  };
  let offset = claim.offset,
    imported = 0,
    review = 0,
    pending = false;
  try {
    const lower = new Date(Date.parse(claim.after) - 86400000)
      .toISOString()
      .slice(0, 10);
    for (let page = 0; page < 3; page++) {
      const rows = await garminActivities(config.key, fetch, {
        start: offset,
        limit: 100,
        startDate: lower,
      });
      const known = rows.length
        ? await admin
            .from("garmin_imports")
            .select("external_id")
            .eq("user_id", user)
            .in(
              "external_id",
              rows.map((a) => a.id),
            )
        : { data: [], error: null };
      if (known.error)
        throw Error("Não foi possível verificar importações anteriores.");
      const importedIds = new Set(
        (known.data ?? []).map((row) => row.external_id),
      );
      for (const activity of rows) {
        if (!activity.startedAt) {
          review++;
          continue;
        }
        if (Date.parse(activity.startedAt) < Date.parse(claim.after)) continue;
        if (importedIds.has(activity.id)) continue;
        const result = await persistGarmin(user, activity, claim.lease);
        if (result.status === "imported") imported++;
        if (result.status === "needs_review") review++;
        if (result.status === "paused" || result.status === "no_active_project")
          break;
      }
      if (rows.length < 100) {
        offset = 0;
        pending = false;
        break;
      }
      offset += rows.length;
      pending = true;
    }
    const done = await admin.rpc("garmin_finish_sync", {
      p_user: user,
      p_lease: claim.lease,
      p_success: true,
      p_offset: offset,
    });
    if (done.error) throw Error("Não foi possível concluir a sincronização.");
    return { imported, review, paused: false, pending };
  } catch (cause) {
    await admin.rpc("garmin_finish_sync", {
      p_user: user,
      p_lease: claim.lease,
      p_success: false,
      p_offset: claim.offset,
    });
    throw cause;
  }
}
