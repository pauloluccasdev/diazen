import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountProfile } from "./profile-values";
import type { Project } from "./domain";
import { planTotals, type DietPlan } from "./diet-plan";

export async function accountProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("user_id,display_name,avatar_id,avatar_key,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle<AccountProfile>();
  if (error) throw Error("Não foi possível carregar seu perfil.");
  return data;
}

export async function profileReferences(client: SupabaseClient, date: string) {
  const active = await client
    .from("projects")
    .select("*")
    .eq("status", "ACTIVE")
    .maybeSingle<Project>();
  if (active.error)
    throw Error("Não foi possível carregar as referências do projeto.");
  if (!active.data) return null;
  const project = active.data;
  const [weight, water, plan] = await Promise.all([
    client
      .from("weights")
      .select("kg,logged_on")
      .eq("project_id", project.id)
      .lte("logged_on", date)
      .order("logged_on", { ascending: false })
      .limit(1)
      .maybeSingle<{ kg: number | string; logged_on: string }>(),
    client
      .from("water_goals")
      .select("target_ml,effective_from")
      .eq("project_id", project.id)
      .lte("effective_from", date)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle<{ target_ml: number; effective_from: string }>(),
    client
      .from("diet_plans")
      .select("title,document,effective_from")
      .eq("project_id", project.id)
      .lte("effective_from", date)
      .or(`valid_until.is.null,valid_until.gte.${date}`)
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .limit(1)
      .maybeSingle<{
        title: string;
        document: DietPlan;
        effective_from: string;
      }>(),
  ]);
  if (weight.error || water.error || plan.error)
    throw Error("Não foi possível carregar as referências do projeto.");
  return {
    project,
    weight: weight.data,
    water: water.data,
    plan: plan.data
      ? {
          title: plan.data.title,
          effective_from: plan.data.effective_from,
          totals: planTotals(plan.data.document.meals),
        }
      : null,
  };
}
export type ProfileReferences = Awaited<ReturnType<typeof profileReferences>>;
