"use client";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { categories } from "@/lib/records";

// Keep a GET fallback for direct links while reopening the native panel in
// place when it is already present. Repeated clicks do not rely on a new URL.
export function DisclosureLink({
  href,
  targetId,
  category,
  navigate = false,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  targetId: string;
  category?: keyof typeof categories;
  navigate?: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (
      navigate ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    const details = document.getElementById(targetId);
    if (!(details instanceof HTMLDetailsElement)) return;
    event.preventDefault();
    if (category) {
      const select = details.querySelector<HTMLSelectElement>(
        "select[name=category]",
      );
      if (select) {
        select.value = category;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    details.open = true;
    details.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    const input = [
      ...details.querySelectorAll<HTMLInputElement>("input[name=name]"),
    ].find((field) => !field.disabled && !field.closest("details:not([open])"));
    (input ?? details.querySelector<HTMLElement>(":scope > summary"))?.focus({
      preventScroll: true,
    });
  }
  return (
    <Link
      href={href}
      onClick={open}
      className={className}
      aria-label={ariaLabel}
      aria-controls={targetId}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
