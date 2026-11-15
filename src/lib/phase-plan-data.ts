import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhasePlan } from "./phase-plans";
export async function currentPhasePlans(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const rows = await Promise.all(
    (["hydration", "strength"] as const).map((kind) =>
      client
        .from("phase_plans")
        .select("*")
        .eq("project_id", project)
        .eq("kind", kind)
        .lte("effective_from", date)
        .or(`valid_until.is.null,valid_until.gte.${date}`)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .limit(1)
        .maybeSingle<PhasePlan>(),
    ),
  );
  if (rows.some((r) => r.error))
    throw Error("Não foi possível carregar os planos vigentes.");
  return { hydration: rows[0].data, strength: rows[1].data };
}
