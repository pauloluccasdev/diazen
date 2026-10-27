export type SleepRecord = {
  id: string;
  user_id: string;
  project_id: string;
  logged_on: string;
  total_seconds: number | null;
  nap_seconds: number | null;
  deep_seconds: number | null;
  light_seconds: number | null;
  rem_seconds: number | null;
  awake_seconds: number | null;
  score: number | null;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
};
export type SleepSettings = {
  enabled: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
};
export function sleepDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "Não informado";
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
export function sleepTimestamp(value: string | null | undefined) {
  if (!value) return "Ainda não consultado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
