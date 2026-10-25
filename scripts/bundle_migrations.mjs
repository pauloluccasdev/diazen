import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
const names = (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const parts = await Promise.all(
  names.map(
    async (name) =>
      `-- Migração: ${name}\n${await readFile(`supabase/migrations/${name}`, "utf8")}`,
  ),
);
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/diazen-migrations.sql",
  "-- Diazen MVP 0.1. Revisar modelo antes de aplicar em projeto Supabase vazio.\n" +
    parts.join("\n"),
);
console.log(
  `Gerado artifacts/diazen-migrations.sql (${names.length} migrações, sem credenciais).`,
);
