import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ProjectSetting({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <details className="project-setting">
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
