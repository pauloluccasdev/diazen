import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Pwa } from "@/components/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Diazen · Sua rotina. Sua evolução.", template: "%s · Diazen" },
  description: "Seu diário de alimentação, hidratação e evolução física.",
  applicationName: "Diazen",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Diazen" },
};

export const viewport: Viewport = { themeColor: "#0C0E12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Pwa />
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        <div className="app-shell">
          <header className="app-header">
            <Link className="brand" href="/" aria-label="Diazen, início">dia<span>zen.</span></Link>
            <span className="preview-label">Prévia do aplicativo</span>
          </header>
          <main id="conteudo">{children}</main>
          <footer className="app-footer"><span>Uma rotina de cada vez.</span><span>Diazen por Lucx Tech</span></footer>
        </div>
      </body>
    </html>
  );
}
