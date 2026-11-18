"use client";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { categories, modalities } from "@/lib/records";

// Keep a GET fallback for direct links while reopening the native panel in
// place when it is already present. Repeated clicks do not rely on a new URL.
export function DisclosureLink({
  href,
  targetId,
  category,
  modality,
  navigate = false,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  targetId: string;
  category?: keyof typeof categories;
  modality?: keyof typeof modalities;
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
    for (const [name, value] of [
      ["category", category],
      ["modality", modality],
    ]) {
      if (!value) continue;
      const select = details.querySelector<HTMLSelectElement>(
        `select[name=${name}]`,
      );
      if (select && !select.matches(":disabled")) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    let ancestor = details.parentElement?.closest("details");
    while (ancestor) {
      ancestor.open = true;
      ancestor = ancestor.parentElement?.closest("details");
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
    ].find(
      (field) =>
        !field.matches(":disabled") && !field.closest("details:not([open])"),
    );
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
      aria-controls={navigate ? undefined : targetId}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
