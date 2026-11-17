import { CalendarDays } from "lucide-react";
import type { Project } from "@/lib/domain";
export function ProjectTimeline({
  project,
  date,
  compact = false,
}: {
  project: Project;
  date: string;
  compact?: boolean;
}) {
  if (!project.ends_on)
    return compact ? (
      <span className="project-mobile-progress">Sem data final definida</span>
    ) : (
      <p className="v2-project-duration">
        <CalendarDays size={16} aria-hidden="true" />
        Projeto sem data final definida
      </p>
    );
  const day = 86400000,
    start = Date.parse(project.starts_on + "T12:00:00Z"),
    end = Date.parse(project.ends_on + "T12:00:00Z"),
    cursor = Date.parse(date + "T12:00:00Z");
  const total = Math.max(1, Math.round((end - start) / day) + 1),
    elapsed = Math.min(
      total,
      Math.max(0, Math.round((cursor - start) / day) + 1),
    ),
    percentage = Math.round((elapsed / total) * 100);
  if (compact)
    return (
      <span className="project-mobile-progress">
        <progress
          max={total}
          value={elapsed}
          aria-label="Tempo decorrido do projeto"
        />
        <strong>{percentage}%</strong>
      </span>
    );
  return (
    <div className="v2-project-timeline">
      <div>
        <span>Tempo decorrido</span>
        <strong>{percentage}%</strong>
      </div>
      <progress
        max={total}
        value={elapsed}
        aria-label="Tempo decorrido do projeto"
      />
      <p>
        {elapsed} de {total} dias · {total - elapsed} dias restantes
      </p>
    </div>
  );
}
