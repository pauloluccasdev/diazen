import Link from "next/link";
import { LayoutDashboard, FolderOpen, UserRound } from "lucide-react";
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
        <Link href="/painel">
          <LayoutDashboard size={16} aria-hidden="true" />
          Dashboard
        </Link>
        <Link href="/painel/projetos">
          <FolderOpen size={16} aria-hidden="true" />
          Projetos
        </Link>
        <Link href="/painel/perfil">
          <UserRound size={16} aria-hidden="true" />
          Minha conta
        </Link>
      </nav>
      {children}
    </>
  );
}
