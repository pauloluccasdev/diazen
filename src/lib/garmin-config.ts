import "server-only";

export function garminConfig(userId: string) {
  const key = process.env.GARMIN_PERSONAL_API_KEY?.trim();
  const owner = process.env.GARMIN_OWNER_USER_ID?.trim();
  if (!key || !owner || userId !== owner) return null;
  return { key };
}

export const garminHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};
