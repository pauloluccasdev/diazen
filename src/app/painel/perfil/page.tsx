import { requireAccount } from "@/lib/data";
import { accountProfile, profileReferences } from "@/lib/profile-data";
import { profileIdentity } from "@/lib/profile-values";
import { displayPreferences } from "@/lib/daily-data";
import { today } from "@/lib/domain";
import {
  ProfileDirectory,
  profileSections,
  type ProfileSection,
} from "@/components/profile/profile-directory";
export const metadata = { title: "Perfil e configurações" };
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; foto?: string }>;
}) {
  const params = await searchParams;
  const section: ProfileSection = profileSections.includes(
    params.secao as (typeof profileSections)[number],
  )
    ? (params.secao as (typeof profileSections)[number])
    : "overview";
  const { client, user } = await requireAccount();
  const profile = await accountProfile(client, user.id);
  const identity = profileIdentity(profile, user.user_metadata?.display_name);
  const [preferences, references] = await Promise.all([
    section === "overview" || section === "preferencias"
      ? displayPreferences(client, user.id)
          .then((data) => ({ data, error: false }))
          .catch(() => ({ data: null, error: true }))
      : Promise.resolve({ data: null, error: false }),
    section === "overview" || section === "metas"
      ? profileReferences(client, today())
          .then((data) => ({ data, error: false }))
          .catch(() => ({ data: null, error: true }))
      : Promise.resolve({ data: null, error: false }),
  ]);
  return (
    <ProfileDirectory
      name={identity.name}
      email={user.email ?? null}
      avatarId={identity.avatarId}
      section={section}
      preferences={preferences.data}
      references={references.data}
      preferencesUnavailable={preferences.error}
      referencesUnavailable={references.error}
      avatarOpen={params.foto === "1"}
    />
  );
}
