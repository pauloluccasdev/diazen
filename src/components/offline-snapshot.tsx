"use client";
import { useEffect } from "react";
import { SNAPSHOT_KEY, SESSION_EPOCH, clearOfflineData } from "@/lib/offline";
export function ClearOfflineData() {
  useEffect(() => {
    clearOfflineData();
  }, []);
  return null;
}
export function OfflineSnapshot({
  project,
  date,
  items,
}: {
  project: string;
  date: string;
  items: { label: string; value: string }[];
}) {
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({
          version: 1,
          project,
          date,
          items,
          epoch: localStorage.getItem(SESSION_EPOCH) ?? "",
          updatedAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        }),
      );
    } catch {
      /* Leitura offline opcional se o navegador não permitir armazenamento. */
    }
  }, [project, date, items]);
  return (
    <p className="privacy-note">
      Um resumo desta consulta fica disponível offline nesta aba por até 24
      horas. Sair da conta apaga o resumo.
    </p>
  );
}
