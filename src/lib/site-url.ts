import "server-only";

export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch { return null; }
}
