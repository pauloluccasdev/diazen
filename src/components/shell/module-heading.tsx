"use client";
import "./module-frame.css";
import { useId, useRef, useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { ReturnLink } from "@/components/return-link";
import { DateNavigator } from "@/components/dashboard/date-navigator";

export function ModuleHeading({
  title,
  description,
  project,
  date,
  path,
  action,
  period,
  query,
}: {
  title: string;
  description: string;
  project: { id: string; name: string };
  date: string;
  path: string;
  action?: ReactNode;
  period?: string;
  query?: Record<string, string>;
}) {
  const root = useRef<HTMLDivElement>(null),
    calendarId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);
  return (
    <div ref={root} className="dz-module-heading-wrap">
      <section className="dz-module-heading">
        <ReturnLink
          href={`/painel?projeto=${project.id}&data=${date}`}
          ariaLabel="Voltar ao dashboard"
        >
          Voltar ao dashboard
        </ReturnLink>
        <div>
          <h1>{title}</h1>
          <p className="dz-module-project">{project.name}</p>
          <p className="dz-module-description">{description}</p>
        </div>
        <button
          type="button"
          id={`${calendarId}-trigger`}
          className="dz-module-calendar"
          aria-label="Escolher data do diário"
          aria-controls={calendarId}
          aria-expanded={calendarOpen}
          onClick={() => {
            const details = root.current?.querySelector<HTMLDetailsElement>(
              ".dz-date-navigator details",
            );
            if (details) {
              details.open = !details.open;
              if (details.open)
                details
                  .querySelector<HTMLInputElement>("input[type=date]")
                  ?.focus();
            }
          }}
        >
          <CalendarDays size={24} aria-hidden="true" />
        </button>
        {action && <div className="dz-module-heading-action">{action}</div>}
      </section>
      <DateNavigator
        date={date}
        project={project.id}
        path={path}
        calendarId={calendarId}
        period={period}
        query={query}
        onCalendarToggle={setCalendarOpen}
        format="long"
      />
    </div>
  );
}
