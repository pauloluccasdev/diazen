import { Worker } from "node:worker_threads";
import { join } from "node:path";
import { parseDietPages, type DietPlan } from "./diet-plan.ts";
const messages: Record<string, string> = {
  pages: "Use um plano com até 30 páginas.",
  password:
    "O PDF está protegido por senha. Exporte uma cópia sem senha para importar.",
  invalid:
    "O arquivo parece inválido ou incompleto. Exporte outra cópia do PDF.",
  text: "O texto do PDF excede o limite desta importação.",
  reader:
    "Não foi possível extrair o texto deste PDF. Exporte outra cópia com texto selecionável.",
  timeout: "A leitura excedeu o tempo disponível. Tente um PDF menor.",
};
export class ServerDietPdfError extends Error {}
export function readServerDietPdf(
  bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<DietPlan> {
  return new Promise((resolve, reject) => {
    // Run the traced ESM entry directly: bundling this worker changes PDF.js resolution.
    const worker = Reflect.construct(Worker, [
      join(process.cwd(), "src/workers/diet-pdf.mjs"),
      {
        workerData: bytes,
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 192 },
      },
    ]) as Worker;
    let settled = false;
    const finish = (error?: Error, plan?: DietPlan) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      void worker.terminate().catch(() => {});
      if (error) reject(error);
      else resolve(plan!);
    };
    const abort = () => finish(new ServerDietPdfError(messages.timeout));
    const timeout = setTimeout(abort, 20000);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.once("message", (result: { pages?: unknown; error?: string }) => {
      if (result.error) {
        finish(
          new ServerDietPdfError(messages[result.error] ?? messages.reader),
        );
        return;
      }
      try {
        if (
          !Array.isArray(result.pages) ||
          !result.pages.length ||
          result.pages.length > 30 ||
          result.pages.some((p) => typeof p !== "string")
        )
          throw Error();
        finish(undefined, parseDietPages(result.pages));
      } catch {
        finish(
          new ServerDietPdfError(
            "Não reconhecemos as tabelas deste PDF. Use uma versão com texto selecionável nos formatos suportados.",
          ),
        );
      }
    });
    worker.once("error", () =>
      finish(
        new ServerDietPdfError(
          "A leitura temporária está indisponível. Tente novamente em instantes.",
        ),
      ),
    );
    worker.once("exit", () => {
      if (!settled) finish(new ServerDietPdfError(messages.reader));
    });
  });
}
