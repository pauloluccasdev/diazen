import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AuthFrame } from "./auth-frame";

export async function AuthShell({
  children,
  welcome = false,
  back = "/",
}: {
  children: ReactNode;
  welcome?: boolean;
  back?: string;
}) {
  const stored = (await cookies()).get("diazen-desktop-theme")?.value;
  return (
    <AuthFrame
      initialTheme={stored === "dark" ? "dark" : "light"}
      welcome={welcome}
      back={back}
    >
      {children}
    </AuthFrame>
  );
}
