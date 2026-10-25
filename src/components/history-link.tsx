"use client";
import Link, { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import type { ComponentProps } from "react";
function PendingHistory() {
  const { pending } = useLinkStatus();
  return pending
    ? createPortal(
        <div
          className="app-loading history-loading"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="brand loading-brand" aria-hidden="true">
            dia<span>zen.</span>
          </div>
          <p>Carregando registros…</p>
        </div>,
        document.body,
      )
    : null;
}
export function HistoryLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} prefetch={false}>
      {children}
      <PendingHistory />
    </Link>
  );
}
