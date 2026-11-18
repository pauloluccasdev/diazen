import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ReturnLink({
  href,
  children,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      prefetch={false}
      className="button-secondary return-link"
      href={href}
      aria-label={ariaLabel}
    >
      <ArrowLeft size={20} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
