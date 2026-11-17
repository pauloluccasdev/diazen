"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Moon,
  Sun,
  X,
  ArrowRight,
  ChevronDown,
  UserRound,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const actions = [
  ["Dashboard", "/painel", "Início, progresso, resumo"],
  [
    "Alimentação",
    "/painel/alimentacao",
    "Diário, refeições, alimentos, calorias",
  ],
  ["Registrar água", "/painel/agua", "Hidratação, copo, garrafa"],
  [
    "Registrar treino",
    "/painel/atividades",
    "Musculação, corrida, ciclismo, natação",
  ],
  ["Peso e evolução", "/painel/peso", "Medições, gráfico"],
  ["Medidas corporais", "/painel/medidas", "Cintura, abdômen, braço"],
  ["Fotos de evolução", "/painel/fotos", "Galeria, comparar"],
  ["Projetos e metas", "/painel/projetos", "Criar, consultar, encerrar"],
  ["Meus planos", "/painel/planos", "Fichas, hidratação, referências"],
  ["Plano alimentar", "/painel/plano", "Dieta, PDF, versões"],
  ["Check-in diário", "/painel/acompanhamento", "Recuperação, reflexão"],
  ["Histórico geral", "/painel/historico", "Calendário, registros"],
  ["Perfil e configurações", "/painel/perfil", "Conta, privacidade, exportar"],
] as const;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function CommandSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.focus();
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!dialog.current?.open) dialog.current?.showModal();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const matches = actions.filter(([title, , keywords]) =>
    normalize(`${title} ${keywords}`).includes(normalize(query.trim())),
  );
  return (
    <>
      <button
        className="dz-search-trigger"
        type="button"
        onClick={open}
        aria-haspopup="dialog"
      >
        <Search size={21} aria-hidden="true" />
        <span>Buscar no Diazen...</span>
        <kbd>⌘ K</kbd>
      </button>
      <dialog
        className="dz-command-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            dialog.current?.close();
          }
        }}
        ref={dialog}
        aria-labelledby="command-title"
        onClose={() => setQuery("")}
      >
        <div className="dz-dialog-heading">
          <h2 id="command-title">Buscar páginas e ações</h2>
          <button
            type="button"
            aria-label="Fechar busca"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <label className="sr-only" htmlFor="command-query">
          O que você quer fazer?
        </label>
        <input
          id="command-query"
          ref={input}
          type="search"
          placeholder="Busque uma página ou ação"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="field-hint">
          Navegue pelos módulos. Os seus registros privados são consultados
          dentro de cada página.
        </p>
        <ul aria-label="Resultados da busca">
          {matches.map(([title, href, keywords]) => (
            <li key={href}>
              <Link
                prefetch={false}
                href={href}
                onClick={() => dialog.current?.close()}
              >
                <span>
                  <strong>{title}</strong>
                  <small>{keywords}</small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        {!matches.length && (
          <p role="status">Nenhuma página encontrada. Tente outro termo.</p>
        )}
      </dialog>
    </>
  );
}

export function DesktopThemeControl({
  theme,
  onChange,
}: {
  theme: "light" | "dark";
  onChange: (theme: "light" | "dark") => void;
}) {
  return (
    <button
      type="button"
      className="dz-theme-control"
      aria-label={
        theme === "light"
          ? "Ativar modo escuro no desktop"
          : "Ativar modo claro no desktop"
      }
      aria-pressed={theme === "dark"}
      onClick={() => onChange(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? (
        <Moon size={21} aria-hidden="true" />
      ) : (
        <Sun size={21} aria-hidden="true" />
      )}
    </button>
  );
}

export function AccountMenu({ name }: { name?: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menu.current?.open &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", outside, { passive: true });
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <details
      className="dz-account-menu"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget) &&
          menu.current
        )
          menu.current.open = false;
      }}
    >
      <summary className="v2-account" aria-label="Minha conta e configurações">
        <span className="v2-avatar">
          <UserRound size={23} aria-hidden="true" />
        </span>
        <span>
          {name || "Minha conta"}
          <small>Meu espaço pessoal</small>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="dz-account-popover">
        <Link
          prefetch={false}
          href="/painel/perfil"
          onClick={() => {
            if (menu.current) menu.current.open = false;
          }}
        >
          <Settings size={18} aria-hidden="true" />
          Perfil e configurações
        </Link>
        <Link prefetch={false} href="/privacidade">
          <ShieldCheck size={18} aria-hidden="true" />
          Privacidade
        </Link>
        <LogoutButton />
      </div>
    </details>
  );
}
