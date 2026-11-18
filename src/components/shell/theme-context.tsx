"use client";
import { createContext, useContext } from "react";
export type DesktopTheme = "light" | "dark";
export const DesktopThemeContext = createContext<{
  theme: DesktopTheme;
  setTheme: (theme: DesktopTheme) => void;
} | null>(null);
export function useDesktopTheme() {
  const value = useContext(DesktopThemeContext);
  if (!value) throw Error("Controle de tema fora do painel.");
  return value;
}
