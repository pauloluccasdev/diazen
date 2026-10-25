"use client";
import { useEffect, useRef } from "react";
import { Check, ChevronRight, Dumbbell } from "lucide-react";
import { HistoryLink } from "@/components/history-link";
import { formatDate } from "@/lib/domain";
export function ActivityWeekSummary({
  date,
  start,
  counts,
  total,
  goal,
  today,
  historyProject,
}: {
  date: string;
  start: string;
  counts: Record<string, number>;
  total: number | null;
  goal: number | null;
  today: string;
  historyProject?: string;
}) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const center = () => {
      const nav = navigation.current;
      const selected = nav?.querySelector<HTMLElement>('[aria-current="date"]');
      if (nav && selected)
        nav.scrollLeft =
          selected.offsetLeft - (nav.clientWidth - selected.offsetWidth) / 2;
    };
    center();
    window.addEventListener("resize", center);
    return () => window.removeEventListener("resize", center);
  }, [date]);
  const historyHref = (value: string) =>
    historyProject
      ? `/painel/atividades?projeto=${historyProject}&data=${value}`
      : `/painel/historico?data=${value}`;
  const progress =
    goal !== null && goal > 0 ? Math.min(100, ((total ?? 0) / goal) * 100) : 0;
  return (
    <section
      className="content-card activity-week-summary"
      aria-labelledby="activity-week-heading"
    >
      <div className="activity-week-heading">
        <span className="icon-box">
          <Dumbbell size={24} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Seu ritmo na semana</p>
          <h2 id="activity-week-heading">
            {total === null
              ? "Sem sessões registradas nesta semana"
              : `${total} sessões na semana`}
          </h2>
        </div>
      </div>
      <div className="activity-week-goal">
        <span>
          {goal === null
            ? "Meta semanal não configurada"
            : `Meta geral: ${goal} sessões por semana`}
        </span>
        {goal !== null && (
          <strong>
            {total ?? 0}/{goal}
          </strong>
        )}
      </div>
      {goal !== null && (
        <div
          className="activity-week-progress"
          role="img"
          aria-label={`${total ?? 0} sessões registradas de uma meta de ${goal}`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <nav
        ref={navigation}
        className="activity-week-days"
        aria-label="Atividades da semana"
      >
        {Array.from({ length: 7 }, (_, index) => {
          const d = new Date(`${start}T12:00:00Z`);
          d.setUTCDate(d.getUTCDate() + index);
          const value = d.toISOString().slice(0, 10),
            count = counts[value] ?? 0;
          const weekday = new Intl.DateTimeFormat("pt-BR", {
            weekday: "short",
            timeZone: "UTC",
          })
            .format(d)
            .replace(".", "");
          const content = (
            <>
              <small>{weekday}</small>
              <strong>{d.getUTCDate()}</strong>
              <span className="activity-day-status">
                {count > 0 ? <Check size={16} aria-hidden="true" /> : "—"}
              </span>
            </>
          );
          const label = `${formatDate(value)} · ${count ? `${count} ${count === 1 ? "atividade registrada" : "atividades registradas"}` : "Sem registros"}`;
          return value > today ? (
            <span
              className="activity-week-day is-future"
              role="group"
              key={value}
              aria-label={`${formatDate(value)} · Dia futuro`}
            >
              {content}
            </span>
          ) : (
            <HistoryLink
              key={value}
              className={`activity-week-day${count ? " has-records" : ""}${value === date ? " is-selected" : ""}`}
              href={historyHref(value)}
              aria-current={value === date ? "date" : undefined}
            >
              {content}
              <span className="sr-only">{label}</span>
            </HistoryLink>
          );
        })}
      </nav>
      <p className="field-hint">
        Os dias marcados têm atividades registradas. Toque em um dia para
        consultar o histórico.
      </p>
      <HistoryLink className="activity-week-history" href={historyHref(date)}>
        Ver histórico de atividades{" "}
        <ChevronRight size={18} aria-hidden="true" />
      </HistoryLink>
    </section>
  );
}
