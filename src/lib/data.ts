import "server-only";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { isId } from "./domain";
import type { Project, WaterGoal } from "./domain";

export async function requireAccount() {
  const client = await createSupabaseServerClient();
  if (!client) redirect("/entrar");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: available, error } = await client.rpc("account_available");
  if (error) throw new Error("Não foi possível verificar sua conta.");
  if (!available) redirect("/conta-excluida");
  return { client, user };
}
export async function projectContext(selectedId?: string, page = 1) {
  const { client, user } = await requireAccount();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 20, page * 20)
    .returns<Project[]>();
  if (error) throw new Error("Não foi possível carregar seus projetos.");
  const hasMore = (data?.length ?? 0) > 20;
  const projects = (data ?? []).slice(0, 20);
  const { data: activeProject, error: activeError } = await client
    .from("projects")
    .select("*")
    .eq("status", "ACTIVE")
    .maybeSingle<Project>();
  if (activeError)
    throw new Error("Não foi possível carregar o projeto ativo.");
  const active = activeProject ?? null;
  let selected: Project | null = active ?? projects[0] ?? null;
  if (selectedId) {
    if (!isId(selectedId)) notFound();
    const { data: target, error: targetError } = await client
      .from("projects")
      .select("*")
      .eq("id", selectedId)
      .maybeSingle<Project>();
    if (targetError) throw new Error("Não foi possível carregar o projeto.");
    selected = target;
  }
  if (selectedId && !selected) notFound();
  let goals: WaterGoal[] = [];
  if (selected) {
    const { data: versions, error: goalError } = await client
      .from("water_goals")
      .select("*")
      .eq("project_id", selected.id)
      .order("effective_from", { ascending: false })
      .returns<WaterGoal[]>();
    if (goalError) throw new Error("Não foi possível carregar as metas.");
    goals = versions ?? [];
  }
  return {
    client,
    user,
    projects,
    active,
    selected: selected ?? null,
    goals,
    hasMore,
    page,
  };
}
