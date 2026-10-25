"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Link2, RefreshCw, Unplug } from "lucide-react";
import { useOnline } from "@/lib/use-online";
import { number, formatDate, isDate } from "@/lib/domain";
import type { StravaActivity } from "@/lib/strava-provider";
const sportNames: Record<string, string> = {
  Run: "Corrida",
  TrailRun: "Corrida em trilha",
  Ride: "Ciclismo",
  VirtualRide: "Ciclismo virtual",
  VirtualRun: "Corrida virtual",
  WeightTraining: "Musculação",
  Workout: "Treino",
  Swim: "Natação",
  Walk: "Caminhada",
  Hike: "Trilha",
};
export function StravaConnection() {
  const [status, setStatus] = useState<{
      configured: boolean;
      connected: boolean;
    } | null>(null),
    [activities, setActivities] = useState<StravaActivity[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const online = useOnline();
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/strava/activities", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data = await response.json();
        setStatus(data);
        const result = new URL(location.href).searchParams.get("strava");
        if (result === "connected" && data.connected)
          setMessage("Conta Strava conectada neste navegador.");
        else if (result === "cancelled")
          setMessage(
            "A conexão não foi autorizada. Você pode tentar novamente.",
          );
        else if (result === "failed")
          setError("Não foi possível conectar ao Strava. Tente novamente.");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Não foi possível verificar a conexão com o Strava.");
      });
    return () => {
      controller.abort();
      if (expiry.current) clearTimeout(expiry.current);
    };
  }, []);
  function request(disconnect = false) {
    if (!online || pending) return;
    setError("");
    setMessage("");
    setActivities([]);
    if (expiry.current) clearTimeout(expiry.current);
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/strava/${disconnect ? "disconnect" : "activities"}`,
          { method: "POST", cache: "no-store" },
        );
        const data = await response.json().catch(() => ({
          message:
            "Não foi possível consultar o Strava. Tente novamente ou entre na conta.",
        }));
        if (!response.ok) {
          if (response.status === 409)
            setStatus((s) => (s ? { ...s, connected: false } : s));
          throw Error(data.message || "Não foi possível consultar o Strava.");
        }
        if (disconnect) {
          setStatus((s) => (s ? { ...s, connected: false } : s));
          setMessage(data.message);
        } else {
          setActivities(data.activities);
          setMessage(
            data.activities.length
              ? "Atividades consultadas diretamente no Strava."
              : "Nenhuma atividade retornada pelo Strava.",
          );
          expiry.current = setTimeout(() => setActivities([]), 15 * 60 * 1000);
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível consultar o Strava.",
        );
      }
    });
  }
  return (
    <section
      id="strava"
      className="content-card strava-connection"
      aria-labelledby="strava-heading"
    >
      <div className="section-heading">
        <h2 id="strava-heading">Sua conta Strava</h2>
        <Link2 size={22} aria-hidden="true" />
      </div>
      <p>
        Consulte até cinco atividades recentes, com duração, distância e
        calorias quando informadas pelo Strava.
      </p>
      <p className="field-hint">
        A consulta fica separada do diário Diazen. As atividades não são
        copiadas para o projeto nem combinadas com a alimentação.
      </p>
      {!status && !error && <p role="status">Verificando conexão…</p>}
      {status && !status.configured && (
        <p className="readonly-note">
          A conexão com o Strava ainda não está disponível.
        </p>
      )}
      {status?.configured && !status.connected && (
        <>
          <p className="field-hint">
            Você autoriza a leitura no Strava. Os dados consultados ficam apenas
            nesta tela e você pode desconectar a conta quando quiser. A conexão
            vale somente neste navegador.
          </p>
          <form method="post" action="/api/strava/connect">
            <button
              type="submit"
              className="button-primary"
              disabled={!online || pending}
            >
              Conectar ao Strava
            </button>
          </form>
        </>
      )}
      {status?.connected && (
        <div className="meal-actions">
          <button
            type="button"
            className="button-primary"
            disabled={!online || pending}
            onClick={() => request()}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {pending ? "Aguarde…" : "Consultar atividades do Strava"}
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={!online || pending}
            onClick={() => request(true)}
          >
            <Unplug size={18} aria-hidden="true" />
            Desconectar Strava
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!online && (
        <p className="readonly-note">
          Sem conexão. A consulta ao Strava fica indisponível.
        </p>
      )}
      {online && activities.length > 0 && (
        <ul className="strava-activities">
          {activities.map((activity) => (
            <li key={activity.id}>
              <h3>{activity.name}</h3>
              <p className="muted">
                {sportNames[activity.sport] ?? activity.sport} ·{" "}
                {isDate(activity.date.slice(0, 10))
                  ? formatDate(activity.date.slice(0, 10))
                  : "Data não informada"}
              </p>
              <dl>
                <div>
                  <dt>Duração em movimento</dt>
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
                <div>
                  <dt>Calorias informadas</dt>
                  <dd>
                    {activity.calories === null
                      ? "Não informadas"
                      : `${number(activity.calories)} kcal`}
                  </dd>
                </div>
              </dl>
              <a
                href={`https://www.strava.com/activities/${activity.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="strava-source"
              >
                View on Strava <ExternalLink size={16} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="field-hint">
        Compatible with Strava ·{" "}
        <a
          href="https://www.strava.com/settings/apps"
          target="_blank"
          rel="noopener noreferrer"
        >
          Gerenciar acesso no Strava
        </a>{" "}
        · <a href="/privacidade">Privacidade</a>
      </p>
    </section>
  );
}
