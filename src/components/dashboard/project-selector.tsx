import Form from "next/form";
import { CalendarDays, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/domain";
import { statusLabel } from "@/lib/domain";

export function ProjectSelector({
  projects,
  selected,
  active,
  date,
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
}) {
  const options = [
    ...new Map(
      [...projects, selected, ...(active ? [active] : [])].map((p) => [
        p.id,
        p,
      ]),
    ).values(),
  ];
  return (
    <details className="v2-project-selector" key={`${selected.id}-${date}`}>
      <summary>
        <FolderOpen size={19} aria-hidden="true" />
        <span>
          <small>
            {selected.id === active?.id
              ? "Projeto ativo"
              : "Projeto em consulta"}
          </small>
          <strong>{selected.name}</strong>
        </span>
      </summary>
      <Form action="/painel" className="v2-query-form">
        <label>
          Projeto para consultar
          <select name="projeto" defaultValue={selected.id}>
            {options.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} · {statusLabel[project.status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            Data da consulta
          </span>
          <input name="data" type="date" required defaultValue={date} />
        </label>
        <p>
          Consultar outro projeto não muda o projeto ativo nem o destino dos
          registros.
        </p>
        <button className="button-primary" type="submit">
          Consultar projeto
        </button>
      </Form>
    </details>
  );
}
