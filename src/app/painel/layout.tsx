import Link from "next/link";
import { requireAccount } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccount();
  return (
    <>
      <nav className="panel-nav" aria-label="Navegação do painel">
        <Link href="/painel">Dashboard</Link>
        <Link href="/painel/projetos">Projetos</Link>
        <Link href="/painel/perfil">Minha conta</Link>
      </nav>
      {children}
    </>
  );
}
