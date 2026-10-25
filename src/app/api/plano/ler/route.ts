import { apiAccount } from "@/lib/api-account";
import { siteUrl } from "@/lib/site-url";
import { readServerDietPdf, ServerDietPdfError } from "@/lib/server-diet-pdf";
export const runtime = "nodejs";
export const maxDuration = 30;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};
const reply = (message: string, status: number) =>
  Response.json({ message }, { status, headers });
export async function POST(request: Request) {
  if (!siteUrl() || request.headers.get("origin") !== siteUrl())
    return reply("Origem não autorizada.", 403);
  if (!(await apiAccount()))
    return reply("Entre novamente para importar o plano.", 401);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/pdf")
    return reply("Selecione um arquivo PDF.", 400);
  const reader = request.body?.getReader();
  if (!reader) return reply("Arquivo inválido.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3 * 1024 * 1024) {
        await reader.cancel();
        return reply("Envie um PDF de até 3 MB.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return reply("O envio foi interrompido. Selecione o PDF novamente.", 400);
  }
  const bytes = Buffer.concat(chunks);
  if (size === 0 || bytes.subarray(0, 5).toString() !== "%PDF-")
    return reply("Selecione um arquivo PDF válido.", 400);
  try {
    const plan = await readServerDietPdf(new Uint8Array(bytes), request.signal);
    return Response.json({ plan }, { headers });
  } catch (error) {
    return reply(
      error instanceof ServerDietPdfError
        ? error.message
        : "Não foi possível ler o plano agora. Tente novamente.",
      422,
    );
  }
}
