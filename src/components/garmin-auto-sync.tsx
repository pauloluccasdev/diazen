"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
export function GarminAutoSync() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const sleepRevision = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function run() {
      if (pending || !navigator.onLine || document.hidden) return;
      pending = true;
      try {
        const response = await fetch("/api/garmin/sync", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.imported > 0) {
          setMessage(
            `${data.imported} ${data.imported === 1 ? "atividade importada" : "atividades importadas"} da Garmin para o diário.`,
          );
          window.dispatchEvent(new Event("diazen:garmin-sync"));
        }
        let sleepChanged = false;
        if (
          typeof data.sleep_revision === "string" ||
          data.sleep_revision === null
        ) {
          sleepChanged =
            data.sleep_revision !== sleepRevision.current &&
            (data.sleep_revision !== null ||
              sleepRevision.current !== undefined);
          if (sleepChanged && sleepRevision.current !== undefined)
            setMessage("Dados de sono da Garmin atualizados.");
          sleepRevision.current = data.sleep_revision;
        }
        if (data.sleep_updated > 0)
          setMessage("Dados de sono da Garmin atualizados.");
        if (data.imported > 0 || data.sleep_checked || sleepChanged)
          router.refresh();
      } catch {
        /* Falha automática mantém o diário disponível; consulta explícita permite nova tentativa. */
      } finally {
        pending = false;
      }
    }
    void run();
    const timer = setInterval(() => void run(), 5 * 60 * 1000);
    const resume = () => void run();
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [router]);
  return message ? (
    <p className="readonly-note" role="status">
      {message}
    </p>
  ) : null;
}
