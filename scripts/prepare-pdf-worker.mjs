import { copyFile, mkdir } from "node:fs/promises";
await mkdir("public/pdf", { recursive: true });
await copyFile(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "public/pdf/worker-6.4.299.mjs",
);
