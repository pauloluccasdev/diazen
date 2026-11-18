"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { saveDesktopTheme, type DesktopTheme } from "@/lib/desktop-theme";
import { DesktopThemeContext } from "@/components/shell/theme-context";
import "./auth.css";

export function AuthBrand({ editorial = false }: { editorial?: boolean }) {
  return (
    <Link
      href="/"
      className={`auth-v2-brand${editorial ? " on-editorial" : ""}`}
      aria-label="Diazen, início"
    >
      diazen<span>.</span>
    </Link>
  );
}

export function AuthFrame({
  children,
  initialTheme,
  welcome = false,
  back = "/",
}: {
  children: ReactNode;
  initialTheme: DesktopTheme;
  welcome?: boolean;
  back?: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  function changeTheme(next: DesktopTheme) {
    setTheme(next);
    saveDesktopTheme(next);
  }
  const Icon = theme === "light" ? Moon : Sun;
  return (
    <DesktopThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      <div
        className={`auth-experience ${welcome ? "auth-mode-welcome" : "auth-mode-form"}`}
        data-desktop-theme={theme}
      >
        <button
          className="auth-theme-control"
          type="button"
          onClick={() => changeTheme(theme === "light" ? "dark" : "light")}
          aria-label={
            theme === "light"
              ? "Ativar modo escuro no desktop"
              : "Ativar modo claro no desktop"
          }
        >
          <Icon size={21} aria-hidden="true" />
        </button>
        {welcome ? (
          children
        ) : (
          <div className="auth-v2-stage">
            <section className="auth-v2-card">
              <header className="auth-v2-header">
                <Link
                  href={back}
                  prefetch={false}
                  className="auth-v2-back"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={20} aria-hidden="true" />
                </Link>
                <AuthBrand />
              </header>
              {children}
            </section>
          </div>
        )}
      </div>
    </DesktopThemeContext.Provider>
  );
}
