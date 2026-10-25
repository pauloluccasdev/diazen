import { apiAccount } from "@/lib/api-account";
import { siteUrl } from "@/lib/site-url";
import { onlineFoodHit, onlineFoodReference } from "@/lib/online-food";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const reply = (message: string, status: number) =>
  Response.json({ message }, { status, headers });
let nextSearch = 0,
  nextProduct = 0;
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return reply("Origem não autorizada.", 403);
  if (!(await apiAccount()))
    return reply("Entre novamente para consultar.", 401);
  const reader = request.body?.getReader();
  if (!reader) return reply("Busca inválida.", 400);
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > 2048) {
        await reader.cancel();
        return reply("Busca muito longa.", 413);
      }
      parts.push(r.value);
    }
  } catch {
    return reply("Busca interrompida.", 400);
  }
  let input;
  try {
    input = JSON.parse(Buffer.concat(parts).toString());
  } catch {
    return reply("Busca inválida.", 400);
  }
  const kind = input?.kind,
    query = typeof input?.query === "string" ? input.query.trim() : "";
  if (
    !["search", "product"].includes(kind) ||
    query.length < 2 ||
    query.length > 100 ||
    (kind === "product" && !/^\d{8,14}$/.test(query))
  )
    return reply("Informe o nome ou código de barras válido.", 400);
  const now = Date.now();
  if (now < (kind === "search" ? nextSearch : nextProduct))
    return reply("Aguarde alguns segundos antes de consultar novamente.", 429);
  if (kind === "search") nextSearch = now + 6500;
  else nextProduct = now + 4500;
  const url =
    kind === "product"
      ? new URL(`https://world.openfoodfacts.org/api/v3.6/product/${query}`)
      : new URL("https://search.openfoodfacts.org/search");
  if (kind === "product")
    url.searchParams.set("fields", "code,product_name,brands,nutrition");
  else {
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "6");
  }
  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Diazen/0.1 (https://github.com/pauloluccasdev/diazen)",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (upstream.status === 404)
      return reply(
        "Produto não encontrado nessa fonte. Tente outro código ou informe o rótulo.",
        404,
      );
    if (!upstream.ok)
      return reply(
        "A fonte online está indisponível ou limitou as consultas. Tente depois ou informe o rótulo.",
        503,
      );
    const stream = upstream.body?.getReader();
    if (!stream) throw Error();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const r = await stream.read();
      if (r.done) break;
      total += r.value.length;
      if (total > 2 * 1024 * 1024) {
        await stream.cancel();
        throw Error();
      }
      chunks.push(r.value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (kind === "product") {
      const reference = onlineFoodReference(data.product);
      return reference
        ? Response.json({ reference }, { headers })
        : reply(
            "Esse produto não tem um rótulo com porção e composição suficientes. Consulte a embalagem ou outra referência.",
            404,
          );
    }
    const hits = Array.isArray(data.hits)
      ? data.hits.map(onlineFoodHit).filter(Boolean).slice(0, 6)
      : [];
    return Response.json({ hits }, { headers });
  } catch {
    return reply(
      "Não foi possível consultar a fonte online. Tente depois ou informe o rótulo.",
      503,
    );
  }
}
