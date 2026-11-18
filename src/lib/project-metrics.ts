import type { Project, ProjectStatus } from "./domain";

export function projectCounts(projects: Pick<Project, "status">[]) {
  const counts: Record<ProjectStatus, number> = {
    ACTIVE: 0,
    DRAFT: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  };
  for (const project of projects) counts[project.status]++;
  return counts;
}

export function projectTiming(
  project: Pick<Project, "starts_on" | "ends_on" | "closed_at">,
  date: string,
) {
  const closed = project.closed_at
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date(project.closed_at))
    : null;
  const cursor = closed && closed < date ? closed : date;
  const difference = (a: string, b: string) =>
    Math.round(
      (Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400000,
    );
  const total = project.ends_on
    ? Math.max(1, difference(project.ends_on, project.starts_on) + 1)
    : null;
  const elapsed = Math.max(0, difference(cursor, project.starts_on) + 1);
  const days = total === null ? elapsed : Math.min(total, elapsed);
  return {
    elapsed: days,
    total,
    percent: total === null ? null : Math.round((days / total) * 100),
    remaining: total === null ? null : total - days,
  };
}

export function projectWeightReference(
  project: Pick<Project, "weight_mode" | "weight_min" | "weight_max">,
) {
  if (project.weight_mode === "target" && project.weight_min != null)
    return { min: Number(project.weight_min), max: null };
  if (
    project.weight_mode === "range" &&
    project.weight_min != null &&
    project.weight_max != null
  )
    return { min: Number(project.weight_min), max: Number(project.weight_max) };
  return null;
}
