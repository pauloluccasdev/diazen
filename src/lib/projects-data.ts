import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "./domain";

export async function allProjects(client: SupabaseClient) {
  const projects: Project[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 999)
      .returns<Project[]>();
    if (error) throw Error("Não foi possível carregar seus projetos.");
    projects.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return projects;
  }
}

export async function projectWeightSummary(
  client: SupabaseClient,
  project: string,
  date: string,
) {
  const results = await Promise.all(
    [true, false].map((ascending) =>
      client
        .from("weights")
        .select("logged_on,kg")
        .eq("project_id", project)
        .lte("logged_on", date)
        .order("logged_on", { ascending })
        .limit(1)
        .maybeSingle<{ logged_on: string; kg: number | string }>(),
    ),
  );
  if (results.some((result) => result.error))
    throw Error("Não foi possível consultar o peso registrado no projeto.");
  const first = results[0].data,
    latest = results[1].data;
  return {
    first,
    latest,
    difference:
      first && latest && first.logged_on !== latest.logged_on
        ? Number(latest.kg) - Number(first.kg)
        : null,
  };
}
