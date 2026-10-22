export function validateSupabaseConfiguration(url?: string, key?: string) {
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
    )
      return null;
    if (parsed.pathname !== "/") return null;
    if (!key.startsWith("sb_publishable_")) {
      if (key.split(".").length !== 3) return null;
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") return null;
    }
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
