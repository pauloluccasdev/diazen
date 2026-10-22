export type ProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export interface Project {
  id: string; user_id: string; name: string; starts_on: string; ends_on: string | null;
  status: ProjectStatus; weight_mode: "none" | "target" | "range" | "track";
  weight_min: number | null; weight_max: number | null; sessions_goal: number | null;
  created_at: string; closed_at: string | null;
}
export interface WaterGoal { id: string; project_id: string; effective_from: string; target_ml: number; }
export const statusLabel: Record<ProjectStatus, string> = { DRAFT: "Rascunho", ACTIVE: "Em andamento", COMPLETED: "Concluído", ARCHIVED: "Arquivado" };
export function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
export function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
export const number = (value: number | string, digits = 1) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
export function isDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value); }
export const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
