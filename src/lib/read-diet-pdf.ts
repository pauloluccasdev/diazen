import { parseDietPages } from "./diet-plan";
export async function readDietPdf(file: File) {
  if (file.size > 3 * 1024 * 1024 || file.size === 0)
    throw new Error("Envie um PDF de até 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("Selecione um arquivo PDF válido.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/worker-6.4.299.mjs";
  const task = pdfjs.getDocument({
    data: bytes,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  const timeout = setTimeout(() => {
    void task.destroy();
  }, 20000);
  try {
    const document = await task.promise;
    if (document.numPages > 30)
      throw new Error("Use um plano com até 30 páginas.");
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
        throw new Error("O texto do PDF excede o limite desta importação.");
      pages.push(text);
      page.cleanup();
    }
    return parseDietPages(pages);
  } finally {
    clearTimeout(timeout);
    await task.destroy();
  }
}
