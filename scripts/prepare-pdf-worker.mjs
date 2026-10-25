import { copyFile, mkdir } from "node:fs/promises";
await mkdir("public/pdf", { recursive: true });
await copyFile(
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  "public/pdf/worker-legacy-6.4.299.mjs",
);
