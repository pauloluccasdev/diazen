import type { Project } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import { ProjectSelector } from "@/components/dashboard/project-selector";
export function ModuleContext({
  projects,
  selected,
  active,
  date,
  path,
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  path: string;
}) {
  return (
    <nav className="dz-module-context" aria-label="Projeto em consulta">
      <ProjectSelector
        projects={projects}
        selected={selected}
        active={active}
        date={date}
        path={path}
      />
      <span>
        {formatDate(selected.starts_on)}
        {selected.ends_on && ` – ${formatDate(selected.ends_on)}`}
      </span>
    </nav>
  );
}
