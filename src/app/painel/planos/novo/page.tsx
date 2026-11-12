import { projectContext } from "@/lib/data";
import { isId, today } from "@/lib/domain";
import { ReturnLink } from "@/components/return-link";
import { PhasePlanEditor } from "@/components/plans/phase-plan-editor";
import type { ProjectPhase } from "@/lib/daily-followup";
import type {
  PhasePlan,
  PlanAsset,
  PlanKind,
  WaterPlan,
  StrengthPlan,
} from "@/lib/phase-plans";
export const metadata = { title: "Cadastrar plano" };
export default async function NewPlan({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; base?: string }>;
}) {
  const params = await searchParams,
    { client, selected, active } = await projectContext();
  if (!active || selected?.id !== active.id)
    return (
      <section className="content-card">
        <ReturnLink href="/painel/planos">Voltar aos planos</ReturnLink>
        <h1>Ative um projeto para cadastrar planos.</h1>
      </section>
    );
  const kind: PlanKind = params.tipo === "strength" ? "strength" : "hydration";
  const [phases, assets, base] = await Promise.all([
    client
      .from("project_phases")
      .select("*")
      .eq("project_id", active.id)
      .order("starts_on", { ascending: false })
      .limit(100)
      .returns<ProjectPhase[]>(),
    client
      .from("plan_assets")
      .select("*")
      .eq("project_id", active.id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(50)
      .returns<PlanAsset[]>(),
    params.base && isId(params.base)
      ? client
          .from("phase_plans")
          .select("*")
          .eq("project_id", active.id)
          .eq("id", params.base)
          .eq("kind", kind)
          .maybeSingle<PhasePlan>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (phases.error || assets.error || base.error || (params.base && !base.data))
    throw Error("Não foi possível carregar o plano e suas referências.");
  const water: WaterPlan = {
    version: 1,
    min_ml: 0,
    max_ml: 0,
    schedule: [],
    alternatives: [],
    notes: "",
  };
  const strength: StrengthPlan = {
    version: 1,
    notes: "",
    workouts: [
      {
        id: crypto.randomUUID(),
        label: "",
        weekdays: [],
        notes: "",
        exercises: [
          {
            id: crypto.randomUUID(),
            name: "",
            sets: 0,
            reps_min: 0,
            reps_max: 0,
            rest_seconds: null,
            notes: "",
          },
        ],
      },
    ],
  };
  const refs = assets.data ?? [];
  if (
    base.data?.reference_image_id &&
    !refs.some((a) => a.id === base.data!.reference_image_id)
  ) {
    const source = await client
      .from("plan_assets")
      .select("*")
      .eq("id", base.data.reference_image_id)
      .maybeSingle<PlanAsset>();
    if (source.data) refs.push(source.data);
  }
  return (
    <div className="module-page">
      <section className="welcome">
        <ReturnLink href="/painel/planos">Voltar aos planos</ReturnLink>
        <p className="eyebrow">{active.name}</p>
        <h1>
          {kind === "hydration"
            ? "Plano de hidratação."
            : "Minhas fichas de musculação."}
        </h1>
        <p>
          Preencha os dados fornecidos por você ou pelo profissional. A imagem é
          uma referência; não há extração automática.
        </p>
      </section>
      <PhasePlanEditor
        kind={kind}
        initial={base.data}
        draft={kind === "hydration" ? water : strength}
        phases={phases.data ?? []}
        assets={refs}
        min={active.starts_on}
        max={active.ends_on}
        date={today()}
      />
    </div>
  );
}
