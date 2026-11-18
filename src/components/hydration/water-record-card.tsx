"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Droplet, EllipsisVertical } from "lucide-react";
import type { Entry } from "@/lib/records";
import { number } from "@/lib/domain";

export function WaterRecordCard({
  row,
  editable,
  children,
}: {
  row: Entry;
  editable: boolean;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menu.current?.open &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", close, { passive: true });
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div className="water-record-card">
      <span className="water-record-icon">
        <Droplet size={25} aria-hidden="true" />
      </span>
      <div className="water-record-volume">
        <h3>{number(row.volume_ml!, 0)} ml</h3>
        {row.container_label && <small>{row.container_label}</small>}
      </div>
      <span className="water-record-time">
        {row.logged_time?.slice(0, 5) ?? "Sem horário"}
      </span>
      {editable && (
        <details
          className="water-record-menu"
          ref={menu}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menu.current) {
              menu.current.open = false;
              menu.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            aria-label={`Gerenciar consumo de ${number(row.volume_ml!, 0)} ml${row.logged_time ? ` às ${row.logged_time.slice(0, 5)}` : ""}`}
          >
            <EllipsisVertical size={23} aria-hidden="true" />
          </summary>
          <div>{children}</div>
        </details>
      )}
    </div>
  );
}
