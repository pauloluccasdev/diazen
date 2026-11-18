import { Table2 } from "lucide-react";
import { useId } from "react";
import { number, formatDate } from "@/lib/domain";
import type { Entry, Summary } from "@/lib/records";
import { macroDistribution, shiftDay } from "@/lib/dashboard-metrics";
import type { DashboardDetails } from "@/lib/dashboard-data";

export function TimeSeriesChart({
  rows,
  start,
  end,
  compact = false,
}: {
  rows: Entry[];
  start: string;
  end: string;
  compact?: boolean;
}) {
  const gradient = useId();
  if (rows.length < 2)
    return (
      <p className="dz-chart-empty">
        Registre peso em pelo menos duas datas para visualizar o gráfico.
      </p>
    );
  const values = [...rows].reverse();
  const min = Math.floor(Math.min(...values.map((row) => Number(row.kg))) - 1);
  const max = Math.ceil(Math.max(...values.map((row) => Number(row.kg))) + 1);
  const first = Date.parse(start + "T12:00:00Z"),
    last = Date.parse(end + "T12:00:00Z");
  const plotWidth = compact ? 282 : 550;
  const baseline = compact ? 108 : 124;
  const plotHeight = compact ? 80 : 100;
  const points = values.map((row) => ({
    row,
    x:
      50 +
      (plotWidth * (Date.parse(row.logged_on + "T12:00:00Z") - first)) /
        Math.max(86400000, last - first),
    y: baseline - ((Number(row.kg) - min) / (max - min)) * plotHeight,
  }));
  return (
    <figure className="dz-time-chart">
      <svg
        viewBox={compact ? "0 0 360 140" : "0 0 650 160"}
        role="img"
        aria-label={`Evolução do peso: ${values.length} medições de ${formatDate(start)} a ${formatDate(end)}`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity=".015" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((index) => {
          const y = baseline - (index * plotHeight) / 4;
          return (
            <g key={index}>
              <line x1="50" x2={50 + plotWidth} y1={y} y2={y} />
              <text x="40" y={y + 4} textAnchor="end">
                {number(min + (index * (max - min)) / 4, 1)}
              </text>
            </g>
          );
        })}
        <polygon
          points={`${points[0].x},${baseline} ${points.map((point) => `${point.x},${point.y}`).join(" ")} ${points.at(-1)!.x},${baseline}`}
          fill={`url(#${gradient})`}
        />
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        />
        {points.map(({ row, x, y }) => (
          <circle
            key={row.id}
            cx={x}
            cy={y}
            r="3.5"
            tabIndex={0}
            role="img"
            aria-label={`${formatDate(row.logged_on)}: ${number(row.kg!)} kg`}
          >
            <title>{`${formatDate(row.logged_on)}: ${number(row.kg!)} kg`}</title>
          </circle>
        ))}
        {[0, 1, 2, 3, 4].map((index) => {
          const date = shiftDay(
            start,
            Math.round((((last - first) / 86400000) * index) / 4),
          );
          return (
            <text
              key={index}
              x={50 + (index * plotWidth) / 4}
              y={baseline + 27}
              textAnchor="middle"
            >
              {date.slice(8)}/{date.slice(5, 7)}
            </text>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        Medições em kg. Datas sem registro não são interpoladas.
      </figcaption>
    </figure>
  );
}

export function MacroDonut({ summary }: { summary: Summary }) {
  const segments = macroDistribution(summary);
  let offset = 0;
  return (
    <div className="dz-macro-distribution">
      <div className="dz-macro-donut">
        <svg
          viewBox="0 0 150 150"
          role="img"
          aria-label={
            segments
              ? "Distribuição energética calculada dos macronutrientes, pela referência 4/4/9"
              : "Distribuição indisponível: faltam dados completos de macronutrientes"
          }
        >
          <circle className="dz-donut-track" cx="75" cy="75" r="60" />
          {segments?.map((share, index) => {
            const start = offset;
            offset += share;
            return (
              <circle
                key={index}
                className={`dz-donut-segment dz-macro-${index}`}
                cx="75"
                cy="75"
                r="60"
                pathLength="100"
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-start}
              />
            );
          })}
        </svg>
        <div>
          <strong className="daily-metric">
            {summary.kcal === null ? "—" : number(summary.kcal, 0)}
          </strong>
          <span>kcal</span>
          {summary.missing_kcal > 0 && <small>parcial</small>}
        </div>
      </div>
      <dl>
        {(
          [
            ["Proteínas", summary.protein, summary.missing_protein],
            ["Carboidratos", summary.carbs, summary.missing_carbs],
            ["Gorduras", summary.fat, summary.missing_fat],
          ] as const
        ).map(([label, value, missing], index) => (
          <div key={label}>
            <dt>
              <i className={`dz-macro-dot dz-macro-${index}`} />
              {label}
            </dt>
            <dd>
              <strong>{value === null ? "—" : `${number(value)} g`}</strong>
              <span>
                {segments
                  ? `${number(segments[index], 0)}%`
                  : missing > 0
                    ? "parcial"
                    : "—"}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="field-hint">
        {segments
          ? "Participação energética dos macros · referência 4/4/9."
          : "Os valores conhecidos são preservados. Sem dados completos, não há percentuais."}
      </p>
    </div>
  );
}

export function WeekComparison({
  details,
  date,
}: {
  details: DashboardDetails;
  date: string;
}) {
  const series = Array.from({ length: 7 }, (_, index) => ({
    day: shiftDay(details.weekStart, index),
    previous: shiftDay(details.previousStart, index),
  }));
  const hasRecords = Object.keys(details.nutrition).length > 0;
  const maximum = Math.max(
    100,
    ...Object.values(details.nutrition).map((item) => item.value ?? 0),
  );
  return (
    <div className="dz-week-comparison">
      <div className="dz-chart-legend">
        <span>
          <i />
          Esta semana
        </span>
        <span>
          <i />
          Semana anterior
        </span>
      </div>
      <div
        className="dz-week-bars"
        role="img"
        aria-label={
          hasRecords
            ? "Calorias registradas por dia: semana selecionada comparada à semana anterior"
            : "Sem registros para comparar neste período"
        }
      >
        {!hasRecords && (
          <p className="dz-week-empty">
            Sem registros para comparar neste período.
          </p>
        )}
        <div className="dz-week-axis" aria-hidden={!hasRecords}>
          <span>{number(maximum, 0)}</span>
          <span>{number(maximum / 2, 0)}</span>
          <span>0</span>
        </div>
        {series.map(({ day, previous }, index) => (
          <div key={day} className="dz-week-day">
            <div className="dz-week-pair">
              {[day, previous].map((value, i) => {
                const item = day <= date ? details.nutrition[value] : undefined;
                return (
                  <span
                    key={value}
                    className={`dz-week-bar ${i ? "is-previous" : ""} ${item?.missing ? "is-partial" : ""}`}
                    style={{
                      height:
                        item?.value == null
                          ? 0
                          : `${(item.value / maximum) * 100}%`,
                    }}
                    title={`${formatDate(value)}: ${item?.value == null ? "Sem registros completos" : `${number(item.value)} kcal${item.missing ? " · parcial" : ""}`}`}
                  />
                );
              })}
            </div>
            <span>
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][index]}
            </span>
          </div>
        ))}
      </div>
      <p className="field-hint">
        kcal registradas · dias equivalentes; ausência de barra não confirma
        consumo zero.
      </p>
      <details className="dz-chart-table">
        <summary>
          <Table2 size={17} aria-hidden="true" />
          <span className="sr-only">Consultar valores do gráfico</span>
        </summary>
        <table>
          <caption>Calorias por dia · semana selecionada e anterior</caption>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Selecionada</th>
              <th>Anterior</th>
            </tr>
          </thead>
          <tbody>
            {series.map(({ day, previous }) => (
              <tr key={day}>
                <th>{formatDate(day)}</th>
                {[day, previous].map((value) => {
                  const item =
                    day <= date ? details.nutrition[value] : undefined;
                  return (
                    <td key={value}>
                      {item?.value == null
                        ? "Sem registros"
                        : `${number(item.value)} kcal${item.missing ? " (parcial)" : ""}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
