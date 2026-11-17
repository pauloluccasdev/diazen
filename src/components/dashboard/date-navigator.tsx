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
}: {
  date: string;
  project: string;
  path?: string;
  period?: string;
}) {
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...(date.slice(0, 4) !== today().slice(0, 4)
      ? { year: "numeric" as const }
      : {}),
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replaceAll(".", "");
  const href = (value: string) =>
    `${path}?${new URLSearchParams({ projeto: project, data: value, ...(period ? { periodo: period } : {}) })}`;
  return (
    <nav className="dz-date-navigator" aria-label="Data da visualização">
      <Link href={href(shift(date, -1))} aria-label="Dia anterior">
        <ChevronLeft size={21} aria-hidden="true" />
      </Link>
      <details key={`${project}-${date}`}>
        <summary title={formatDate(date)}>
          <CalendarDays size={20} aria-hidden="true" />
          <span>
            {date === today() ? "Hoje, " : ""}
            {shortDate}
          </span>
        </summary>
        <Form action={path} className="dz-date-form">
          <input type="hidden" name="projeto" value={project} />
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
      <Link href={href(shift(date, 1))} aria-label="Próximo dia">
        <ChevronRight size={21} aria-hidden="true" />
      </Link>
    </nav>
  );
}
