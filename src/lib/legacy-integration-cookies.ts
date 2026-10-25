import "server-only";
import { cookies } from "next/headers";
// Remove cookies left by the retired Strava integration. No provider calls.
export async function clearLegacyIntegrationCookies() {
  const jar = await cookies();
  for (const name of ["diazen-strava-state", "diazen-strava-session"])
    jar.delete(name);
}
