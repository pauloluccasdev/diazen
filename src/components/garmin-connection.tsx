"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ExternalLink, RefreshCw, Watch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/lib/use-online";
import { number, formatDate, isDate } from "@/lib/domain";
import type { GarminActivity } from "@/lib/garmin-provider";

const sportNames: Record<string, string> = {
  running: "Corrida",
  trail_running: "Corrida em trilha",
  treadmill_running: "Esteira",
  cycling: "Ciclismo",
  road_biking: "Ciclismo de estrada",
  indoor_cycling: "Ciclismo indoor",
  strength_training: "Musculação",
  fitness_equipment: "Treino",
  cardio_training: "Cardio",
  swimming: "Natação",
  lap_swimming: "Natação em piscina",
  open_water_swimming: "Natação em águas abertas",
  walking: "Caminhada",
  hiking: "Trilha",
  other: "Outra atividade",
};
export function GarminConnection() {
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState("consult");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [settings, setSettings] = useState<{
    enabled: boolean;
    auto_after: string | null;
    last_success_at: string | null;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch("/api/garmin/settings", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (r) => {
          if (r.ok) setSettings(await r.json());
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("diazen:garmin-sync", load);
    return () => {
      controller.abort();
      window.removeEventListener("diazen:garmin-sync", load);
    };
  }, []);
  const online = useOnline();
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
    },
    [],
  );
  function clear() {
    setActivities([]);
    setSelected([]);
    setMessage("");
    setError("");
    if (expiry.current) clearTimeout(expiry.current);
  }
  function consult() {
    if (!online || pending) return;
    setOperation("consult");
    setMessage("");
    setError("");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    startTransition(async () => {
      try {
        const response = await fetch("/api/garmin/activities", {
          method: "POST",
          cache: "no-store",
          signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(data.activities)) {
          if (response.status === 401 || response.status === 403) {
            setActivities([]);
            setSelected([]);
          }
          throw Error(
            data.message ||
              "Não foi possível consultar a Garmin. Tente novamente.",
          );
        }
        if (signal.aborted) return;
        setActivities(data.activities);
        setSelected([]);
        if (expiry.current) clearTimeout(expiry.current);
        setMessage(
          data.activities.length
            ? "Atividades consultadas no Garmin Connect."
            : "Nenhuma atividade encontrada no Garmin Connect. Sincronize seu dispositivo e consulte novamente.",
        );
        expiry.current = setTimeout(
          () => {
            setActivities([]);
            setSelected([]);
            setMessage(
              "A consulta expirou. Atualize para ver suas atividades novamente.",
            );
          },
          15 * 60 * 1000,
        );
      } catch (cause) {
        if (!signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a Garmin.",
          );
      }
    });
  }
  function importSelected() {
    if (!online || pending || !selected.length) return;
    setOperation("import");
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/garmin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selected }),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(data.message || "Não foi possível importar.");
        const success = new Set<string>(
          data.results
            .filter((r: { status: string }) =>
              ["imported", "already_imported"].includes(r.status),
            )
            .map((r: { externalId: string }) => r.externalId),
        );
        setActivities((rows) =>
          rows.map((a) => (success.has(a.id) ? { ...a, imported: true } : a)),
        );
        setSelected([]);
        const count = data.results.filter(
          (r: { status: string }) => r.status === "imported",
        ).length;
        setMessage(
          `${count} ${count === 1 ? "atividade importada" : "atividades importadas"} para o diário.`,
        );
        if (
          data.results.some(
            (r: { status: string }) =>
              !["imported", "already_imported"].includes(r.status),
          )
        )
          setError(
            "Algumas atividades não puderam ser importadas. Confira a data dentro do projeto ativo e a duração informada.",
          );
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Não foi possível importar.",
        );
      }
    });
  }
  function toggleAutomatic(enabled: boolean) {
    if (!online || pending) return;
    setOperation("settings");
    setError("");
    const previous = settings?.enabled;
    setSettings((current) => (current ? { ...current, enabled } : current));
    startTransition(async () => {
      try {
        const response = await fetch("/api/garmin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(
            data.message || "Não foi possível alterar a sincronização.",
          );
        setSettings((current) =>
          current ? { ...current, enabled: data.enabled } : current,
        );
        setMessage(
          enabled
            ? "Importação automática ativada."
            : "Importação automática pausada. Os registros existentes foram preservados.",
        );
      } catch (cause) {
        if (previous !== undefined)
          setSettings((current) =>
            current ? { ...current, enabled: previous } : current,
          );
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível alterar a sincronização.",
        );
      }
    });
  }
  return (
    <section
      id="garmin"
      className="content-card garmin-connection"
      aria-labelledby="garmin-heading"
      aria-busy={pending}
    >
      <div className="section-heading">
        <h2 id="garmin-heading">Atividades da Garmin</h2>
        <Watch size={24} aria-hidden="true" />
      </div>
      <p>
        Suas cinco atividades mais recentes do Garmin Connect, disponíveis
        apenas para você.
      </p>
      <p className="field-hint">
        Escolha atividades anteriores para salvar no diário. As novas podem ser
        importadas automaticamente para o projeto ativo, sem duplicação.
      </p>
      {settings && (
        <div className="garmin-auto-setting">
          <label>
            <input
              type="checkbox"
              checked={settings.enabled}
              disabled={!online || pending}
              onChange={(e) => toggleAutomatic(e.target.checked)}
            />{" "}
            Importar automaticamente novas atividades
          </label>
          <p className="field-hint">
            {settings.enabled
              ? "Atualização ao abrir o Diazen e a cada 15 minutos em segundo plano."
              : "Importação automática pausada."}{" "}
            {settings.auto_after &&
              `Novas atividades a partir de ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(settings.auto_after))}.`}
          </p>
        </div>
      )}
      <div className="meal-actions">
        <button
          type="button"
          className="button-primary"
          disabled={!online || pending}
          onClick={consult}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {pending ? "Buscando atividades…" : "Consultar atividades da Garmin"}
        </button>
        {activities.length > 0 && (
          <button
            type="button"
            className="button-secondary"
            disabled={pending}
            onClick={clear}
          >
            Limpar consulta
          </button>
        )}
      </div>
      {pending && (
        <p role="status">
          {operation === "import"
            ? "Salvando atividades no diário…"
            : operation === "settings"
              ? "Atualizando sincronização…"
              : "Consultando suas atividades no Garmin Connect…"}
        </p>
      )}
      {message && !pending && <p role="status">{message}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!online && (
        <p className="readonly-note">
          Sem conexão. Conecte-se à internet para consultar a Garmin.
        </p>
      )}
      {online && activities.length > 0 && (
        <ul className="garmin-activities">
          {activities.map((activity) => (
            <li key={activity.id}>
              {activity.imported ? (
                <span className="field-hint">
                  {activity.removed
                    ? "Importada anteriormente e removida do diário"
                    : "Registrada no diário"}
                </span>
              ) : (
                <label className="garmin-selection">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${activity.name}`}
                    checked={selected.includes(activity.id)}
                    disabled={!online || pending}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, activity.id]
                          : ids.filter((id) => id !== activity.id),
                      )
                    }
                  />
                  Importar para o diário
                </label>
              )}
              <details className="garmin-activity-details">
                <summary>
                  <span>
                    <strong>{activity.name}</strong>
                    <small>
                      {isDate(activity.date.slice(0, 10))
                        ? formatDate(activity.date.slice(0, 10))
                        : "Data não informada"}{" "}
                      ·{" "}
                      {sportNames[activity.sport] ??
                        activity.sport.replaceAll("_", " ")}
                    </small>
                  </span>
                  <span className="garmin-kcal">
                    {activity.calories === null
                      ? "Sem calorias informadas"
                      : `${number(activity.calories)} kcal`}
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <div className="garmin-activity-body">
                  <dl>
                    <div>
                      <dt>Duração</dt>
                      <dd>
                        {activity.seconds === null
                          ? "Não informada"
                          : `${number(activity.seconds / 60)} min`}
                      </dd>
                    </div>
                    <div>
                      <dt>Distância</dt>
                      <dd>
                        {activity.metres === null
                          ? "Não informada"
                          : `${number(activity.metres / 1000, 2)} km`}
                      </dd>
                    </div>
                  </dl>
                  <a
                    href={`https://connect.garmin.com/modern/activity/${activity.id}`}
                    className="garmin-source"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver no Garmin Connect{" "}
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                  <p className="field-hint">
                    Fonte: Garmin Connect. Valores informados pelo provedor.
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {online && selected.length > 0 && (
        <button
          type="button"
          className="button-primary"
          disabled={pending}
          onClick={importSelected}
        >
          Importar selecionadas ({selected.length})
        </button>
      )}
      <p className="field-hint">
        Os registros importados incluem título, tipo, data, duração, distância e
        calorias disponíveis. Podem ser editados no diário. Seus dados originais
        na Garmin ficam preservados. <a href="/privacidade">Privacidade</a>
      </p>
    </section>
  );
}
