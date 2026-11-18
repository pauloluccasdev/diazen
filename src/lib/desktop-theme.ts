export type DesktopTheme = "light" | "dark";

export function saveDesktopTheme(theme: DesktopTheme) {
  document.cookie = `diazen-desktop-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
