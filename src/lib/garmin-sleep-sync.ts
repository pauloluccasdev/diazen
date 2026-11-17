import "server-only";
import { createAdminClient } from "./supabase/admin";
import { garminConfig } from "./garmin-config";
import { garminSleep } from "./garmin-provider";
export async function syncGarminSleep(user: string) {
  const admin = createAdminClient(),
    config = garminConfig(user);
  if (!admin || !config) throw Error("Integração indisponível");
  async function revision() {
    const current = await admin!
      .from("sleep_records")
      .select("updated_at")
      .eq("user_id", user)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (current.error)
      throw Error("Não foi possível conferir o sono sincronizado");
    return (current.data?.updated_at ?? null) as string | null;
  }
  const claim = await admin.rpc("garmin_claim_sleep", { p_user: user });
  if (claim.error) throw Error("Não foi possível iniciar a consulta do sono");
  if (!claim.data)
    return { updated: 0, checked: false, revision: await revision() };
  const { lease, from, to } = claim.data as {
    lease: string;
    from: string;
    to: string;
  };
  let updated = 0;
  try {
    const rows = await garminSleep(config.key, from, to);
    for (const row of rows) {
      const saved = await admin.rpc("garmin_store_sleep", {
        p_user: user,
        p_lease: lease,
        p_data: row,
      });
      if (saved.error) throw Error("Não foi possível salvar o sono");
      if (saved.data === true) updated++;
    }
    const finished = await admin.rpc("garmin_finish_sleep", {
      p_user: user,
      p_lease: lease,
      p_success: true,
    });
    if (finished.error) throw Error("Não foi possível concluir a consulta");
    return { updated, checked: true, revision: await revision() };
  } catch (cause) {
    await admin.rpc("garmin_finish_sleep", {
      p_user: user,
      p_lease: lease,
      p_success: false,
    });
    throw cause;
  }
}
