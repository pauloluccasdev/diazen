"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ExternalLink, RefreshCw, Watch } from "lucide-react";
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
    setMessage("");
    setError("");
    if (expiry.current) clearTimeout(expiry.current);
  }
  function consult() {
    if (!online || pending) return;
    clear();
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
        if (!response.ok || !Array.isArray(data.activities))
          throw Error(
            data.message ||
              "Não foi possível consultar a Garmin. Tente novamente.",
          );
        if (signal.aborted) return;
        setActivities(data.activities);
        setMessage(
          data.activities.length
            ? "Consulta atualizada com o Garmin Connect."
            : "Nenhuma atividade encontrada no Garmin Connect. Sincronize seu dispositivo e consulte novamente.",
        );
        expiry.current = setTimeout(
          () => {
            setActivities([]);
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
        <p role="status">Consultando suas atividades no Garmin Connect…</p>
      )}
      {message && <p role="status">{message}</p>}
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
      <p className="field-hint">
        Esta consulta não registra atividades no diário nem altera seus dados na
        Garmin. <a href="/privacidade">Privacidade</a>
      </p>
    </section>
  );
}
