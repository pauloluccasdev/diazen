import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, Plus } from "lucide-react";
import type { ProjectPhase } from "@/lib/daily-followup";
import { formatDate } from "@/lib/domain";
export function DayOverview({
  date,
  project,
  projectName,
  phase,
  checkin,
  available,
  editable,
}: {
  date: string;
  project: string;
  projectName: string;
  phase: ProjectPhase | null;
  checkin: boolean;
  available: boolean;
  editable: boolean;
}) {
  const target = `projeto=${project}&data=${date}`;
  return (
    <section
      className="content-card day-overview"
      aria-labelledby="day-overview-title"
    >
      <div className="day-overview-header">
        <span className="icon-box">
          <CalendarDays size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">{formatDate(date)}</p>
          <h2 id="day-overview-title">Meu dia, um passo de cada vez</h2>
        </div>
      </div>
      <p className="day-project-name">{projectName}</p>
      <div className="day-phase">
        <strong>{phase?.name ?? "Seu projeto, no seu ritmo"}</strong>
        <p>
          {phase?.objective ??
            "Você pode organizar o projeto em fases, sem mudar seus registros."}
        </p>
        {phase?.milestone_on && phase.milestone_on >= date && (
          <p>
            Próximo marco: {phase.milestone} · {formatDate(phase.milestone_on)}
          </p>
        )}
        <Link href={`/painel/fases?projeto=${project}`}>
          {phase ? "Ver fases do projeto" : "Configurar fases"}{" "}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="day-quick-actions" aria-label="Ações do dia">
        {[
          ["alimentacao", "Registrar alimentação"],
          ["agua", "Registrar água"],
          ["atividades", "Registrar atividade"],
        ].map(([path, label]) => (
          <Link
            key={path}
            className="button-secondary"
            href={`/painel/${path}?${target}`}
          >
            <Plus size={16} aria-hidden="true" />
            {editable
              ? label
              : `Consultar ${path === "agua" ? "hidratação" : path === "alimentacao" ? "alimentação" : "atividades"}`}
          </Link>
        ))}
      </div>
      <Link
        className="day-checkin-link"
        href={`/painel/acompanhamento?${target}`}
      >
        <Heart size={22} aria-hidden="true" />
        <span>
          <strong>
            {checkin
              ? "Meu check-in foi registrado"
              : "Como estou me sentindo?"}
          </strong>
          <small>
            {!available
              ? "Não foi possível carregar o acompanhamento. Tente novamente."
              : checkin
                ? "Consultar ou revisar minha percepção do dia"
                : "Sono percebido, disposição e contexto alimentar. Tudo opcional."}
          </small>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </section>
  );
}
