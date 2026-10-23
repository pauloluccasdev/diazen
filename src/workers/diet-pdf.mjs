import { parentPort, workerData } from "node:worker_threads";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfTextLines } from "../lib/pdf-text.mjs";
// This thread owns the bytes. No filesystem, URL source, storage or telemetry.
let task;
try {
  task = getDocument({
    data: workerData,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  const document = await task.promise;
  if (document.numPages > 30) parentPort.postMessage({ error: "pages" });
  else {
    const pages = [];
    let length = 0;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      const text = pdfTextLines(content.items);
      length += text.length;
      if (length > 150000) throw Error("text_limit");
      pages.push(text);
      page.cleanup();
    }
    parentPort.postMessage({ pages });
  }
} catch (error) {
  const code =
    error?.name === "PasswordException"
      ? "password"
      : error?.name === "InvalidPDFException"
        ? "invalid"
        : error?.message === "text_limit"
          ? "text"
          : "reader";
  parentPort.postMessage({ error: code });
} finally {
  await task?.destroy().catch(() => {});
}
