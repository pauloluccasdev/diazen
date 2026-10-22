import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  chmod,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  cleanupArchiveWorkspace,
  privateKey,
  keyOutsideDestination,
  seal,
  publish,
  verifyArchive,
} from "../../scripts/backup_archive.mjs";
test("backup cifrado confere conteúdo, rejeita corrupção e protege a chave", async () => {
  const root = await mkdtemp(join(tmpdir(), "diazen-backup-test-"));
  try {
    const data = join(root, "data"),
      output = join(root, "output");
    await mkdir(data);
    await mkdir(output);
    const key = randomBytes(32).toString("base64url"),
      keyFile = join(root, "key");
    await writeFile(keyFile, key, { mode: 0o644 });
    await assert.rejects(privateKey(keyFile), /privado/);
    await chmod(keyFile, 0o600);
    assert.equal(await privateKey(keyFile), key);
    assert.throws(
      () => keyOutsideDestination(join(output, "..secret"), output),
      /fora/,
    );
    keyOutsideDestination(keyFile, output);
    await writeFile(
      join(data, "database.dump"),
      "snapshot fictício sem dados pessoais",
    );
    await writeFile(join(data, "deletion-ledger.json"), "[]");
    await mkdir(join(data, "images"));
    await writeFile(
      join(data, "images", "0.webp"),
      Buffer.from([82, 73, 70, 70]),
    );
    const encrypted = await seal(data, root, output, key, {
      kind: "snapshot",
      created_at: "2026-10-22T12:00:00Z",
      files: [
        { path: "database.dump" },
        { path: "deletion-ledger.json" },
        { path: "images/0.webp", storage_key: "ficticio" },
      ],
    });
    assert.equal(
      (await readdir(output)).filter((f) => !f.endsWith(".partial")).length,
      0,
      "não publicar antes de verificar",
    );
    const published = await publish(encrypted);
    assert.equal((await verifyArchive(published.path, root, key)).files, 3);
    assert.equal(
      (await readFile(published.path)).includes(
        Buffer.from("snapshot fictício"),
      ),
      false,
    );
    await assert.rejects(
      verifyArchive(
        published.path,
        root,
        randomBytes(32).toString("base64url"),
      ),
      /falhou/,
    );
    const bytes = await readFile(published.path);
    bytes[bytes.length - 1] ^= 1;
    const corrupt = join(output, "corrupt.gpg");
    await writeFile(corrupt, bytes);
    await assert.rejects(verifyArchive(corrupt, root, key), /falhou/);
    assert.equal(
      (await readdir(output)).some((f) => f.endsWith(".partial")),
      false,
    );
  } finally {
    cleanupArchiveWorkspace(root);
    await rm(root, { recursive: true, force: true });
  }
});
