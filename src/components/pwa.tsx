"use client";

import { useEffect } from "react";
import { useOnline } from "@/lib/use-online";

export function Pwa() {
  const online = useOnline();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Não foi possível registrar o service worker.", error);
      });
    }
  }, []);

  if (online) return null;
  return <div className="offline-notice" role="status">Sem conexão. A criação e a alteração de registros estão indisponíveis.</div>;
}
