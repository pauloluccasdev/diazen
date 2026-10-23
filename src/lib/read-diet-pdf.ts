import { parseDietPages } from "./diet-plan";
export class DietPdfError extends Error {}
export async function readDietPdf(file: File) {
  if (file.size > 3 * 1024 * 1024 || file.size === 0)
    throw new DietPdfError("Envie um PDF de até 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new DietPdfError(
      "Não foi possível ler: selecione um arquivo PDF válido.",
    );
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => {
    throw new DietPdfError(
      "Não foi possível iniciar o leitor de PDF. Atualize a página e tente novamente.",
    );
  });
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/worker-legacy-6.4.299.mjs";
  const task = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void task.destroy().catch(() => {});
  }, 20000);
  try {
    const document = await task.promise;
    if (document.numPages > 30)
      throw new DietPdfError("Use um plano com até 30 páginas.");
    const pages: string[] = [];
    let length = 0;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      const rows: {
        y: number;
        parts: { x: number; width: number; text: string }[];
      }[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = item.transform[5],
          x = item.transform[4];
        let row = rows.find((r) => Math.abs(r.y - y) < 2);
        if (!row) {
          row = { y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, width: item.width, text: item.str });
      }
      const text = rows
        .sort((a, b) => b.y - a.y)
        .map((row) => {
          let end = -Infinity;
          return row.parts
            .sort((a, b) => a.x - b.x)
            .map((part) => {
              const gap = part.x - end;
              end = part.x + part.width;
              return `${gap > 12 ? "    " : " "}${part.text}`;
            })
            .join("")
            .trim();
        })
        .join("\n");
      length += text.length;
      if (length > 150000)
        throw new DietPdfError(
          "O texto do PDF excede o limite desta importação.",
        );
      pages.push(text);
      page.cleanup();
    }
    try {
      return parseDietPages(pages);
    } catch {
      throw new DietPdfError(
        "Não reconhecemos as tabelas deste PDF. Use uma versão com texto selecionável nos formatos de plano suportados.",
      );
    }
  } catch (cause) {
    if (timedOut)
      throw new DietPdfError(
        "A leitura demorou mais que o esperado. Tente novamente com um PDF menor ou neste navegador atualizado.",
      );
    if (cause instanceof DietPdfError) throw cause;
    if (cause instanceof Error && cause.name === "PasswordException")
      throw new DietPdfError(
        "O PDF está protegido por senha. Exporte uma cópia sem senha para importar.",
      );
    if (cause instanceof Error && cause.name === "InvalidPDFException")
      throw new DietPdfError(
        "Não foi possível ler este PDF: o arquivo parece inválido ou incompleto. Selecione novamente ou exporte outra cópia.",
      );
    throw new DietPdfError(
      "Não foi possível concluir a leitura neste navegador. Atualize a página e tente novamente; se persistir, use um navegador atualizado.",
    );
  } finally {
    clearTimeout(timeout);
    await task.destroy().catch(() => {});
  }
}
