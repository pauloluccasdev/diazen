"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, UserRound } from "lucide-react";

const links = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/painel/perfil", label: "Minha conta", icon: UserRound },
];

export function PanelNav() {
  const pathname = usePathname();
  return (
    <nav className="panel-nav primary-nav" aria-label="Navegação do painel">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
