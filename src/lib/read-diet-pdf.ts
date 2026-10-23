import { parseDietPages, type DietPlan } from "./diet-plan";
import { pdfTextLines } from "./pdf-text.mjs";
export class DietPdfError extends Error {
  constructor(
    message: string,
    readonly serverFallback = false,
  ) {
    super(message);
  }
}
async function readLocalDietPdf(file: File) {
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
      true,
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
      const text = pdfTextLines(content.items);
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
        true,
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
      "Não foi possível concluir a leitura neste navegador.",
      true,
    );
  } finally {
    clearTimeout(timeout);
    await task.destroy().catch(() => {});
  }
}

export async function readDietPdf(
  file: File,
  onServerFallback?: () => void,
): Promise<DietPlan> {
  try {
    return await readLocalDietPdf(file);
  } catch (error) {
    if (!(error instanceof DietPdfError) || !error.serverFallback) throw error;
    onServerFallback?.();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/plano/ler", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: file,
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.plan)
        throw new DietPdfError(
          typeof result.message === "string"
            ? result.message
            : "Não foi possível ler o PDF agora. Tente novamente.",
        );
      return result.plan;
    } catch (cause) {
      if (cause instanceof DietPdfError) throw cause;
      throw new DietPdfError(
        "Não foi possível enviar o PDF para leitura temporária. Confira a conexão e tente novamente.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
