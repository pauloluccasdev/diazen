import { projectContext } from "@/lib/data";
import { isDate, today } from "@/lib/domain";
import { garminConfig } from "@/lib/garmin-config";
import { ReturnLink } from "@/components/return-link";
import { SleepCard } from "@/components/sleep-card";
import type { SleepRecord, SleepSettings } from "@/lib/sleep";
export const metadata = { title: "Sono" };
export const dynamic = "force-dynamic";
export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; data?: string }>;
}) {
  const params = await searchParams;
  const { selected, active, client, user } = await projectContext(
    params.projeto,
  );
  const date =
    params.data && isDate(params.data) && params.data <= today()
      ? params.data
      : today();
  if (!selected)
    return (
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <h1>Sono.</h1>
        <p>Crie e ative um projeto para sincronizar seu sono.</p>
      </section>
    );
  const [record, settings] = await Promise.all([
    client
      .from("sleep_records")
      .select("*")
      .eq("project_id", selected.id)
      .eq("logged_on", date)
      .maybeSingle(),
    client
      .from("garmin_sleep_settings")
      .select("enabled,last_attempt_at,last_success_at,last_error_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (record.error || settings.error)
    throw Error("Não foi possível carregar o sono.");
  const configured = Boolean(garminConfig(user.id)),
    editable = selected.status === "ACTIVE" && selected.id === active?.id;
  return (
    <div className="module-page">
      <section className="welcome">
        <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
        <p className="eyebrow">{selected.name}</p>
        <h1>
          Sono<span className="accent">.</span>
        </h1>
        <p className="intro">
          Seus dados da Garmin, atualizados quando disponíveis no Garmin
          Connect.
        </p>
      </section>
      {!editable && (
        <p className="readonly-note">
          Projeto somente leitura. A sincronização salva somente no projeto
          ativo.
        </p>
      )}
      {!configured && (
        <p className="readonly-note">
          A integração Garmin não está disponível nesta conta. Os registros
          existentes permanecem para consulta.
        </p>
      )}
      <SleepCard
        row={record.data as SleepRecord | null}
        settings={settings.data as SleepSettings | null}
        date={date}
        project={selected.id}
        configured={configured}
        editable={editable}
        details
      />
    </div>
  );
}
