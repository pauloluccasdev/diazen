"use client";
import "./shell/desktop-tools.css";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AccountMenu,
  CommandSearch,
  DesktopThemeControl,
} from "./shell/desktop-tools";
import {
  Home,
  FolderOpen,
  Utensils,
  Droplet,
  Dumbbell,
  ChartNoAxesCombined,
  Camera,
  UserRound,
  Settings,
  Ellipsis,
  NotebookPen,
  History,
  Heart,
  BookOpen,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

const destinations = [
  { href: "/painel", label: "Dashboard", icon: Home },
  { href: "/painel/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/painel/alimentacao", label: "Alimentação", icon: Utensils },
  { href: "/painel/agua", label: "Hidratação", icon: Droplet },
  { href: "/painel/atividades", label: "Treinos", icon: Dumbbell },
  { href: "/painel/peso", label: "Evolução", icon: ChartNoAxesCombined },
  { href: "/painel/fotos", label: "Fotos", icon: Camera },
];
const more = [
  { href: "/painel/agua", label: "Hidratação", icon: Droplet },
  { href: "/painel/atividades", label: "Treinos", icon: Dumbbell },
  {
    href: "/painel/medidas",
    label: "Medidas corporais",
    icon: ChartNoAxesCombined,
  },
  { href: "/painel/fotos", label: "Fotos privadas", icon: Camera },
  { href: "/painel/planos", label: "Meus planos", icon: BookOpen },
  { href: "/painel/acompanhamento", label: "Check-in diário", icon: Heart },
  { href: "/painel/historico", label: "Histórico geral", icon: History },
  { href: "/painel/perfil", label: "Minha conta", icon: Settings },
];
export function PanelShell({
  children,
  initialTheme = "light",
  accountName,
}: {
  children: React.ReactNode;
  initialTheme?: "light" | "dark";
  accountName?: string;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState(initialTheme);
  const changeTheme = (next: "light" | "dark") => {
    setTheme(next);
    document.cookie = `diazen-desktop-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  };
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside, { passive: true });
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const isCurrent = (href: string) =>
    href === "/painel"
      ? pathname === href
      : href === "/painel/peso"
        ? ["/painel/peso", "/painel/medidas"].includes(pathname)
        : href === "/painel/alimentacao"
          ? [
              "/painel/alimentacao",
              "/painel/alimentos",
              "/painel/plano",
            ].includes(pathname)
          : href === "/painel/projetos"
            ? ["/painel/projetos", "/painel/fases"].includes(pathname)
            : pathname === href || pathname.startsWith(href + "/");
  return (
    <div className="panel-shell" data-desktop-theme={theme}>
      <a className="skip-link" href="#panel-content">
        Pular para o conteúdo
      </a>
      <aside className="v2-sidebar">
        <Link
          className="v2-wordmark"
          href="/painel"
          aria-label="Diazen, início"
        >
          diazen<span>.</span>
        </Link>
        <nav aria-label="Navegação principal">
          {destinations.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="v2-sidebar-bottom">
          <Link
            href="/painel/perfil"
            aria-current={isCurrent("/painel/perfil") ? "page" : undefined}
          >
            <Settings size={21} aria-hidden="true" />
            Configurações
          </Link>
          <Link href="/privacidade">
            <ShieldCheck size={21} aria-hidden="true" />
            Privacidade
          </Link>
          <small>Diazen por Lucx Tech</small>
        </div>
      </aside>
      <div className="v2-workspace">
        <header className="v2-header">
          <Link
            className="v2-wordmark"
            href="/painel"
            aria-label="Diazen, início"
          >
            dia<span>zen.</span>
          </Link>
          <span className="v2-tagline">Sua rotina. Sua evolução.</span>
          <div className="dz-desktop-tools">
            <CommandSearch />
            <DesktopThemeControl theme={theme} onChange={changeTheme} />
            <AccountMenu name={accountName} />
          </div>
          <Link
            className="v2-account"
            href="/painel/perfil"
            aria-label="Minha conta e configurações"
          >
            <span className="v2-avatar">
              <UserRound size={21} aria-hidden="true" />
            </span>
            <span>
              Minha conta<small>Seu espaço pessoal</small>
            </span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <div
          id="panel-content"
          tabIndex={-1}
          className={`v2-content${pathname === "/painel" ? " v2-dashboard-content" : ""}`}
        >
          {children}
        </div>
      </div>
      <nav className="v2-bottom-nav" aria-label="Navegação do painel">
        {[
          { href: "/painel", label: "Início", icon: Home },
          { href: "/painel/alimentacao", label: "Diário", icon: NotebookPen },
          { href: "/painel/projetos", label: "Projetos", icon: FolderOpen },
          {
            href: "/painel/peso",
            label: "Evolução",
            icon: ChartNoAxesCombined,
          },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            aria-current={isCurrent(href) ? "page" : undefined}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
        <details
          ref={menu}
          className="v2-more"
          onBlur={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              !event.currentTarget.contains(event.relatedTarget) &&
              menu.current
            )
              menu.current.open = false;
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menu.current) {
              menu.current.open = false;
              menu.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            aria-current={
              [
                "/painel",
                "/painel/alimentacao",
                "/painel/projetos",
                "/painel/peso",
              ].some(isCurrent)
                ? undefined
                : "page"
            }
          >
            <Ellipsis size={23} aria-hidden="true" />
            <span>Mais</span>
          </summary>
          <div className="v2-more-panel">
            <strong>Seu Diazen</strong>
            {more.map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                aria-current={isCurrent(href) ? "page" : undefined}
                onClick={() => {
                  if (menu.current) menu.current.open = false;
                }}
              >
                <Icon size={19} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </div>
  );
}
