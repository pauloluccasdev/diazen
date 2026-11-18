"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";
export function PhotoCardMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null),
    contentId = useId();
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", outside, { passive: true });
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <details
      ref={menu}
      className="photo-card-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget) &&
          menu.current
        )
          menu.current.open = false;
      }}
    >
      <summary aria-label={label} aria-controls={contentId}>
        <EllipsisVertical size={18} aria-hidden="true" />
      </summary>
      <div id={contentId} className="photo-card-menu-body">
        {children}
      </div>
    </details>
  );
}
