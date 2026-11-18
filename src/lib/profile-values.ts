export interface AccountProfile {
  user_id: string;
  display_name: string | null;
  avatar_id: string | null;
  avatar_key: string | null;
  created_at: string;
  updated_at: string;
}

export function normalizeProfileName(input: unknown) {
  if (input == null || input === "") return { value: null, error: "" };
  if (typeof input !== "string")
    return { value: null, error: "Informe um nome válido ou deixe em branco." };
  const name = input.trim();
  if ([...name].length > 80 || /\p{Cc}/u.test(name))
    return {
      value: null,
      error: "Use até 80 caracteres, sem quebras de linha.",
    };
  return { value: name || null, error: "" };
}

export function legacyProfileName(input: unknown) {
  if (typeof input !== "string") return null;
  return normalizeProfileName([...input].slice(0, 80).join("")).value;
}

export function profileIdentity(
  profile: Pick<AccountProfile, "display_name" | "avatar_id"> | null,
  legacyName?: unknown,
) {
  return {
    name: profile ? profile.display_name : legacyProfileName(legacyName),
    avatarId: profile?.avatar_id ?? null,
  };
}

export function profileInitials(name: string | null) {
  const words = name?.trim().split(/\s+/u).filter(Boolean) ?? [];
  if (!words.length) return "";
  const parts =
    words.length === 1
      ? [...words[0]].slice(0, 2).join("")
      : [...words[0]][0] + [...words.at(-1)!][0];
  return [...parts.toLocaleUpperCase("pt-BR")].slice(0, 2).join("");
}
