"use client";
import { useEffect, useRef } from "react";
import Form from "next/form";
import { CalendarDays, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/domain";
import { statusLabel, formatDate } from "@/lib/domain";
import { ProjectTimeline } from "./project-timeline";

export function ProjectSelector({
  projects,
  selected,
  active,
  date,
  path = "/painel",
}: {
  projects: Project[];
  selected: Project;
  active: Project | null;
  date: string;
  path?: string;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", outside, { passive: true });
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const options = [
    ...new Map(
      [...projects, selected, ...(active ? [active] : [])].map((p) => [
        p.id,
        p,
      ]),
    ).values(),
  ];
  return (
    <details
      className="v2-project-selector"
      key={`${selected.id}-${date}`}
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget) &&
          menu.current
        )
          menu.current.open = false;
      }}
    >
      <summary>
        <FolderOpen size={19} aria-hidden="true" />
        <span>
          <small>
            {selected.id === active?.id
              ? "Projeto ativo"
              : "Projeto em consulta"}
          </small>
          <strong>{selected.name}</strong>
          <span className="project-mobile-dates">
            {formatDate(selected.starts_on)}
            {selected.ends_on && ` – ${formatDate(selected.ends_on)}`}
          </span>
          <ProjectTimeline project={selected} date={date} compact />
        </span>
      </summary>
      <Form prefetch={false} action={path} className="v2-query-form">
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
