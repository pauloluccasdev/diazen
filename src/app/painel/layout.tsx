import { GarminAutoSync } from "@/components/garmin-auto-sync";
import { garminConfig } from "@/lib/garmin-config";
import { PanelNav } from "@/components/panel-nav";
import { requireAccount } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAccount();
  return (
    <>
      <PanelNav />
      {garminConfig(user.id) && process.env.GARMIN_SYNC_ENABLED === "true" && (
        <GarminAutoSync />
      )}
      {children}
    </>
  );
}
