import { GarminAutoSync } from "@/components/garmin-auto-sync";
import { garminConfig } from "@/lib/garmin-config";
import { PanelShell } from "@/components/panel-shell";
import { requireAccount } from "@/lib/data";
import { cookies } from "next/headers";
import { accountProfile } from "@/lib/profile-data";
import { profileIdentity } from "@/lib/profile-values";
export const dynamic = "force-dynamic";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, client } = await requireAccount();
  let identity: ReturnType<typeof profileIdentity> = {
    name: null,
    avatarId: null,
  };
  let profileUnavailable = false;
  try {
    identity = profileIdentity(
      await accountProfile(client, user.id),
      user.user_metadata?.display_name,
    );
  } catch {
    profileUnavailable = true;
  }
  const theme = (await cookies()).get("diazen-desktop-theme")?.value;
  return (
    <>
      {garminConfig(user.id) && process.env.GARMIN_SYNC_ENABLED === "true" && (
        <GarminAutoSync />
      )}
      <PanelShell
        initialTheme={theme === "dark" ? "dark" : "light"}
        accountName={identity.name ?? undefined}
        accountAvatarId={identity.avatarId}
        accountProfileUnavailable={profileUnavailable}
      >
        {children}
      </PanelShell>
    </>
  );
}
