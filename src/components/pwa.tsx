"use client";

import { useEffect } from "react";
import { SNAPSHOT_KEY, SESSION_EPOCH } from "@/lib/offline";
import { useOnline } from "@/lib/use-online";

export function Pwa() {
  const online = useOnline();

  useEffect(() => {
    const clearFromOtherTab = (event: StorageEvent) => { if (event.key === SESSION_EPOCH) { try { sessionStorage.removeItem(SNAPSHOT_KEY); } catch { /* Cache opcional. */ } } };
    window.addEventListener("storage", clearFromOtherTab);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Não foi possível registrar o service worker.", error);
      });
    }
    return () => window.removeEventListener("storage", clearFromOtherTab);
  }, []);

  if (online) return null;
  return <div className="offline-notice" role="status">Sem conexão. A criação e a alteração de registros estão indisponíveis.</div>;
}
