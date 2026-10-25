import type { ReactNode } from "react";

export function ProgressRing({
  value,
  max,
  label,
  children,
}: {
  value: number | null;
  max: number | null;
  label: string;
  children: ReactNode;
}) {
  const progress =
    value !== null && max !== null && max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : 0;
  return (
    <div className="progress-ring">
      <svg viewBox="0 0 120 120" role="img" aria-label={label}>
        <circle className="ring-track" cx="60" cy="60" r="52" />
        <circle
          className="ring-fill"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          strokeDasharray={`${progress} 100`}
          visibility={progress > 0 ? "visible" : "hidden"}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}
