import { GarminAutoSync } from "@/components/garmin-auto-sync";
import { garminConfig } from "@/lib/garmin-config";
import { PanelShell } from "@/components/panel-shell";
import { requireAccount } from "@/lib/data";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAccount();
  const theme = (await cookies()).get("diazen-desktop-theme")?.value;
  return (
    <>
      {garminConfig(user.id) && process.env.GARMIN_SYNC_ENABLED === "true" && (
        <GarminAutoSync />
      )}
      <PanelShell
        initialTheme={theme === "dark" ? "dark" : "light"}
        accountName={
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name.slice(0, 80)
            : undefined
        }
      >
        {children}
      </PanelShell>
    </>
  );
}
