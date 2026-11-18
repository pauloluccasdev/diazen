import "@/components/hydration/hydration.css";
import { ContainerManager } from "@/components/hydration/container-manager";
import { ReturnLink } from "@/components/return-link";
import { requireAccount } from "@/lib/data";
import { waterContainers } from "@/lib/hydration-data";

export const metadata = { title: "Recipientes de água" };
export default async function ContainersPage() {
  const { client } = await requireAccount();
  const containers = await waterContainers(client);
  return (
    <div className="water-diary water-containers-page">
      <ReturnLink href="/painel/agua">Voltar à hidratação</ReturnLink>
      <h1>Seus recipientes</h1>
      <p>
        Este cadastro pertence à sua conta. Você pode gerenciá-lo mesmo sem um
        projeto ativo. Alterações não modificam consumos anteriores.
      </p>
      <ContainerManager containers={containers} initiallyOpen />
    </div>
  );
}
