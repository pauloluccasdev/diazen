"use client";
import Link from "next/link";
import Form from "next/form";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, today } from "@/lib/domain";

function shift(date: string, days: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
export function DateNavigator({
  date,
  project,
  path = "/painel",
  period,
  query,
  calendarId,
  onCalendarToggle,
  format = "compact",
}: {
  date: string;
  project: string;
  path?: string;
  period?: string;
  query?: Record<string, string>;
  calendarId?: string;
  onCalendarToggle?: (open: boolean) => void;
  format?: "compact" | "long";
}) {
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: format === "long" ? "long" : "short",
    ...(format === "long" ? { weekday: "short" as const } : {}),
    timeZone: "UTC",
    ...(date.slice(0, 4) !== today().slice(0, 4)
      ? { year: "numeric" as const }
      : {}),
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replaceAll(".", "");
  const href = (value: string) =>
    `${path}?${new URLSearchParams({ ...query, projeto: project, data: value, ...(period ? { periodo: period } : {}) })}`;
  return (
    <nav className="dz-date-navigator" aria-label="Data da visualização">
      <Link
        prefetch={false}
        href={href(shift(date, -1))}
        aria-label="Dia anterior"
      >
        <ChevronLeft size={21} aria-hidden="true" />
      </Link>
      <details
        id={calendarId}
        key={`${project}-${date}`}
        onToggle={(event) => onCalendarToggle?.(event.currentTarget.open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            const trigger = calendarId
              ? document.getElementById(`${calendarId}-trigger`)
              : null;
            (trigger?.getClientRects().length
              ? trigger
              : event.currentTarget.querySelector("summary")
            )?.focus();
          }
        }}
      >
        <summary title={formatDate(date)}>
          <CalendarDays size={20} aria-hidden="true" />
          <span>
            {date === today() && format === "compact" ? "Hoje, " : ""}
            {shortDate.charAt(0).toUpperCase() + shortDate.slice(1)}
          </span>
        </summary>
        <Form prefetch={false} action={path} className="dz-date-form">
          <input type="hidden" name="projeto" value={project} />
          {Object.entries(query ?? {})
            .filter(([key]) => !["projeto", "data", "periodo"].includes(key))
            .map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          {period && <input type="hidden" name="periodo" value={period} />}
          <label>
            Escolher data
            <input type="date" name="data" defaultValue={date} required />
          </label>
          <button type="submit" className="button-primary">
            Consultar data
          </button>
        </Form>
      </details>
      <Link
        prefetch={false}
        href={href(shift(date, 1))}
        aria-label="Próximo dia"
      >
        <ChevronRight size={21} aria-hidden="true" />
      </Link>
    </nav>
  );
}
