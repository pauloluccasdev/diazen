import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function ReturnLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="button-secondary return-link" href={href}>
      <ArrowLeft size={20} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
