import { ClearOfflineData } from "@/components/offline-snapshot";
import { ProjectDirectory } from "@/components/projects/project-directory";
import { ProjectRemovalFeedback } from "@/components/projects/project-dialog";
import { requireAccount } from "@/lib/data";
import { statusLabel, today, type ProjectStatus } from "@/lib/domain";
import { allProjects, projectWeightSummary } from "@/lib/projects-data";
export const metadata = { title: "Projetos e metas" };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    estado?: string;
    excluido?: string;
    limpeza?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.pagina)) || 1),
  );
  const status =
    params.estado && Object.hasOwn(statusLabel, params.estado)
      ? (params.estado as ProjectStatus)
      : undefined;
  const { client } = await requireAccount();
  const projects = await allProjects(client);
  const active = projects.find((project) => project.status === "ACTIVE");
  const date = today();
  const weight = active
    ? await projectWeightSummary(client, active.id, date)
    : null;
  return (
    <>
      {params.excluido === "1" && (
        <>
          <ClearOfflineData />
          <ProjectRemovalFeedback pending={params.limpeza === "pendente"} />
        </>
      )}
      <ProjectDirectory
        projects={projects}
        status={status}
        page={page}
        date={date}
        weight={weight}
      />
    </>
  );
}
