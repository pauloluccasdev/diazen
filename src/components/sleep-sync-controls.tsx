"use client";
import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useOnline } from "@/lib/use-online";
import { sleepTimestamp, type SleepSettings } from "@/lib/sleep";
export function SleepSyncControls({
  settings,
}: {
  settings: SleepSettings | null;
}) {
  const [enabled, setEnabled] = useOptimistic(
    settings?.enabled ?? false,
    (_previous: boolean, next: boolean) => next,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const online = useOnline(),
    router = useRouter();
  function run(body: { enabled: boolean } | { check: true }) {
    startTransition(async () => {
      setMessage("");
      if ("enabled" in body) setEnabled(body.enabled);
      try {
        const r = await fetch("/api/garmin/sleep", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) {
          setMessage(
            data.message ?? "Não foi possível consultar. Tente novamente.",
          );
          return;
        }
        setMessage(
          data.message ??
            ("enabled" in body
              ? body.enabled
                ? "Sincronização do sono ativada. Os dados disponíveis serão atualizados automaticamente."
                : "Sincronização do sono pausada. O histórico foi preservado."
              : data.checked
                ? "Consulta concluída. Os dados disponíveis foram atualizados."
                : "Nenhuma consulta pendente agora. A próxima verificação automática ocorrerá em cerca de 15 minutos."),
        );
        router.refresh();
      } catch {
        setMessage(
          "Não foi possível conectar. Tente novamente quando estiver online.",
        );
      }
    });
  }
  return (
    <div className="sleep-sync-controls">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending || !online}
          onChange={(e) => run({ enabled: e.target.checked })}
        />
        Sincronizar meu sono com a Garmin
      </label>
      <p className="field-hint">
        Ao ativar, consultaremos hoje e os dois dias anteriores, dentro do
        projeto ativo. Novas verificações ocorrem durante todo o dia, em cerca
        de 15 minutos.
      </p>
      <p className="field-hint">
        O relógio precisa enviar os dados ao Garmin Connect. A consulta inclui
        novas informações e revisões, como cochilos registrados mais tarde.
      </p>
      {enabled && (
        <>
          <p className="field-hint">
            Última consulta: {sleepTimestamp(settings?.last_success_at)}
          </p>
          {settings?.last_error_at && (
            <p className="readonly-note">
              A última tentativa falhou. Os dados anteriores continuam
              disponíveis; uma nova tentativa será feita automaticamente.
            </p>
          )}
          <button
            type="button"
            className="button-secondary"
            disabled={pending || !online}
            onClick={() => run({ check: true })}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {pending ? "Consultando…" : "Verificar sono disponível"}
          </button>
        </>
      )}
      {pending && <p role="status">Atualizando sincronização do sono…</p>}
      {message && (
        <p role="status" className="readonly-note">
          {message}
        </p>
      )}
      {!online && (
        <p role="status">Sem conexão. A sincronização está bloqueada.</p>
      )}
    </div>
  );
}
