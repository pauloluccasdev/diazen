import Link from "next/link";
import { MoonStar, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/domain";
import {
  sleepDuration,
  sleepTimestamp,
  type SleepRecord,
  type SleepSettings,
} from "@/lib/sleep";
import { SleepSyncControls } from "./sleep-sync-controls";
export function SleepCard({
  row,
  date,
  project,
  settings,
  configured,
  editable,
  details = false,
}: {
  row: SleepRecord | null;
  date: string;
  project: string;
  settings: SleepSettings | null;
  configured: boolean;
  editable: boolean;
  details?: boolean;
}) {
  return (
    <section className="content-card sleep-card" aria-label="Sono da Garmin">
      <div className="sleep-card-heading">
        <span className="icon-box">
          <MoonStar size={24} aria-hidden="true" />
        </span>
        <div>
          <h2>Sono</h2>
          <p className="muted">{formatDate(date)} · Garmin Connect</p>
        </div>
      </div>
      {row ? (
        <>
          <dl className="sleep-main-metrics">
            <div>
              <dt>Sono principal</dt>
              <dd>{sleepDuration(row.total_seconds)}</dd>
            </div>
            <div>
              <dt>Pontuação Garmin</dt>
              <dd>
                {row.score === null ? "Não informada" : `${row.score}/100`}
              </dd>
            </div>
          </dl>
          <p className="field-hint">
            Atualizado em {sleepTimestamp(row.updated_at)}
          </p>
          {details && (
            <>
              <dl className="sleep-stage-grid">
                {(
                  [
                    ["Leve", row.light_seconds],
                    ["Profundo", row.deep_seconds],
                    ["REM", row.rem_seconds],
                    ["Acordado", row.awake_seconds],
                    ["Cochilos", row.nap_seconds],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{sleepDuration(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="field-hint">
                O sono principal não inclui cochilos. Os valores são informados
                pela Garmin e podem ser revisados após novas sincronizações.
              </p>
            </>
          )}
        </>
      ) : (
        <p className="sleep-empty">
          {date ===
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(new Date())
            ? "Aguardando dados de sono para hoje."
            : "Sem dados de sono para esta data."}{" "}
          A ausência de registro não significa que você não dormiu.
        </p>
      )}
      {configured &&
        editable &&
        (details ? (
          <SleepSyncControls settings={settings} />
        ) : (
          <details className="sleep-options" open={!settings?.enabled && !row}>
            <summary>
              Sincronização Garmin · {settings?.enabled ? "Ativa" : "Pausada"}
            </summary>
            <SleepSyncControls settings={settings} />
          </details>
        ))}
      {!details && (
        <Link
          className="button-secondary meal-record-link"
          href={`/painel/sono?projeto=${project}&data=${date}`}
        >
          <span>Ver sono e sincronização</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}
      {details && (
        <Link
          className="button-secondary"
          href={`/painel/historico?data=${date}`}
        >
          Consultar histórico geral
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
