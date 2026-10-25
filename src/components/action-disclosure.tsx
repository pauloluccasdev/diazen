import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ActionDisclosure({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`project-setting ${className}`.trim()}>
      <summary>
        <span className="project-setting-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <span className="project-setting-title">{title}</span>
        <ChevronDown
          className="project-setting-chevron"
          size={18}
          aria-hidden="true"
        />
      </summary>
      <div className="project-setting-body">{children}</div>
    </details>
  );
}
