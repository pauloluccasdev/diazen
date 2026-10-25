"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function GarminAutoSync() {
  const router = useRouter();
  const [message, setMessage] = useState("");
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
          router.refresh();
        }
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
