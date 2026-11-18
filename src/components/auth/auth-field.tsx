import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function AuthField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="auth-v2-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-shell">
        <Icon size={19} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
