import { useId } from "react";
import type { Entry } from "@/lib/records";
import { number, formatDate } from "@/lib/domain";

export function WeightChart({ rows }: { rows: Entry[] }) {
  const gradientId = useId();
  if (rows.length < 2)
    return (
      <p className="muted">
        Registre peso em pelo menos duas datas para visualizar o gráfico.
      </p>
    );
  const values = [...rows].reverse();
  const min = Math.min(...values.map((r) => Number(r.kg))) - 1;
  const max = Math.max(...values.map((r) => Number(r.kg))) + 1;
  const coordinates = values.map((r, i) => ({
    x: 48 + (i * 504) / (values.length - 1),
    y: 156 - ((Number(r.kg) - min) * 132) / (max - min),
    row: r,
  }));
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  return (
    <figure className="weight-chart">
      <svg
        viewBox="0 0 600 202"
        role="img"
        aria-label={`Peso nas últimas ${values.length} medições: de ${number(values[0].kg!)} a ${number(values.at(-1)!.kg!)} kg. Os valores estão no histórico abaixo.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9F24" stopOpacity=".22" />
            <stop offset="100%" stopColor="#FF9F24" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((step) => {
          const y = 156 - step * 132;
          return (
            <g key={step}>
              <line
                x1="48"
                y1={y}
                x2="552"
                y2={y}
                stroke="#30343B"
                strokeDasharray="3 5"
              />
              <text
                x="38"
                y={y + 4}
                textAnchor="end"
                fill="#A0A6B1"
                fontSize="12"
              >
                {number(min + step * (max - min), 1)}
              </text>
            </g>
          );
        })}
        <polygon
          points={`48,156 ${points} 552,156`}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="#FF9F24"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {coordinates.map(({ x, y, row }) => (
          <circle key={row.id} cx={x} cy={y} r="4" fill="#FF9F24">
            <title>
              {formatDate(row.logged_on)}: {number(row.kg!)} kg
            </title>
          </circle>
        ))}
        {[
          coordinates[0],
          coordinates[Math.floor((coordinates.length - 1) / 2)],
          coordinates.at(-1)!,
        ]
          .filter(
            (point, index, all) =>
              all.findIndex((p) => p.row.id === point.row.id) === index,
          )
          .map(({ x, row }) => (
            <text
              key={row.id}
              x={x}
              y="184"
              textAnchor="middle"
              fill="#A0A6B1"
              fontSize="12"
            >
              {formatDate(row.logged_on).slice(0, 5)}
            </text>
          ))}
      </svg>
      <figcaption className="muted">
        Últimas {values.length} medições · valores em kg
      </figcaption>
    </figure>
  );
}
