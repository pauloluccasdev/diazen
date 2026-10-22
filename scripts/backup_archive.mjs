import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, realpathSync } from "node:fs";
import {
  mkdir,
  readFile,
  writeFile,
  open,
  rm,
  rename,
  stat,
} from "node:fs/promises";
import { join, resolve, relative, sep, isAbsolute } from "node:path";

export async function digest(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
export function run(program, args, options = {}) {
  const r = spawnSync(program, args, {
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: "C" },
    timeout: 600000,
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
  if (r.status !== 0)
    throw Error(
      `${program.split("/").at(-1)} falhou (código ${r.status ?? "timeout"}).`,
    );
  return r.stdout;
}
export async function privateKey(path) {
  const info = await stat(path);
  if (!info.isFile() || (process.platform !== "win32" && info.mode & 0o077))
    throw Error("A chave deve ser um arquivo privado (chmod 600).");
  const key = (await readFile(path, "utf8")).trim();
  if (!/^[A-Za-z0-9_-]{43,4096}$/.test(key))
    throw Error("Formato de chave de backup inválido.");
  return key;
}
function gpgOptions(work, key) {
  return {
    input: key + "\n",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      LANG: "C",
      GNUPGHOME: join(work, "gpg"),
    },
  };
}
const gpgFlags = [
  "--batch",
  "--no-tty",
  "--no-symkey-cache",
  "--pinentry-mode",
  "loopback",
  "--passphrase-fd",
  "0",
];
const allowed = (path) =>
  /^(manifest\.json|database\.dump|deletion-ledger\.json|images\/\d+\.webp)$/.test(
    path,
  );
export async function seal(data, work, outputDirectory, key, manifest) {
  const files = [];
  for (const file of manifest.files) {
    if (!allowed(file.path) || file.path === "manifest.json")
      throw Error("Caminho de backup inválido.");
    const info = await stat(join(data, file.path));
    files.push({
      ...file,
      bytes: info.size,
      sha256: await digest(join(data, file.path)),
    });
  }
  const complete = { ...manifest, version: 1, files };
  await writeFile(
    join(data, "manifest.json"),
    JSON.stringify(complete, null, 2),
    { mode: 0o600 },
  );
  const tar = join(work, "archive-" + randomUUID() + ".tar");
  run("tar", ["-cf", tar, "-C", data, "."]);
  await mkdir(join(work, "gpg"), { recursive: true, mode: 0o700 });
  const prefix = manifest.kind === "ledger" ? "diazen-ledger" : "diazen-backup";
  const name = `${prefix}-${manifest.created_at.replace(/[:.]/g, "-")}-${randomUUID()}.tar.gpg`;
  const partial = join(outputDirectory, name + ".partial");
  const fd = await open(partial, "wx", 0o600);
  try {
    run(
      "gpg",
      [
        ...gpgFlags,
        "--symmetric",
        "--cipher-algo",
        "AES256",
        "--output",
        "-",
        tar,
      ],
      { ...gpgOptions(work, key), stdio: ["pipe", fd.fd, "pipe"] },
    );
  } catch (e) {
    await rm(partial, { force: true });
    throw e;
  } finally {
    await fd.close();
    await rm(tar, { force: true });
  }
  try {
    await verifyArchive(partial, work, key);
  } catch (e) {
    await rm(partial, { force: true });
    throw e;
  }
  return {
    partial,
    final: join(outputDirectory, name),
    sha256: await digest(partial),
    bytes: (await stat(partial)).size,
  };
}
export async function publish(archive) {
  await rename(archive.partial, archive.final);
  return { path: archive.final, sha256: archive.sha256, bytes: archive.bytes };
}
export async function verifyArchive(file, work, key) {
  await mkdir(join(work, "gpg"), { recursive: true, mode: 0o700 });
  const verification = join(work, "verify-" + randomUUID());
  await mkdir(verification, { mode: 0o700 });
  try {
    const tar = join(verification, "archive.tar"),
      data = join(verification, "data");
    run(
      "gpg",
      [...gpgFlags, "--output", tar, "--decrypt", resolve(file)],
      gpgOptions(work, key),
    );
    const listing = run("tar", ["-tf", tar]).trim().split("\n");
    for (const entry of listing) {
      const normalized = entry.startsWith("./") ? entry.slice(2) : entry;
      if (!["", ".", "images/"].includes(normalized) && !allowed(normalized))
        throw Error("Arquivo contém caminhos inesperados.");
    }
    const types = run("tar", ["-tvf", tar]).trim().split("\n");
    if (types.some((line) => !["-", "d"].includes(line[0])))
      throw Error("Links e arquivos especiais não são permitidos.");
    await mkdir(data, { mode: 0o700 });
    run("tar", [
      "-xf",
      tar,
      "-C",
      data,
      "--no-same-owner",
      "--no-same-permissions",
      "--keep-old-files",
    ]);
    const manifest = JSON.parse(
      await readFile(join(data, "manifest.json"), "utf8"),
    );
    if (
      manifest.version !== 1 ||
      !["snapshot", "ledger"].includes(manifest.kind) ||
      !Array.isArray(manifest.files) ||
      !manifest.files.length
    )
      throw Error("Manifesto inválido.");
    const seen = new Set();
    for (const item of manifest.files) {
      if (
        !allowed(item.path) ||
        item.path === "manifest.json" ||
        seen.has(item.path)
      )
        throw Error("Manifesto contém caminho inválido ou repetido.");
      seen.add(item.path);
      if (
        (await stat(join(data, item.path))).size !== item.bytes ||
        (await digest(join(data, item.path))) !== item.sha256
      )
        throw Error("Checksum do backup não confere.");
    }
    if (
      !seen.has("deletion-ledger.json") ||
      (manifest.kind === "snapshot" && !seen.has("database.dump"))
    )
      throw Error("Backup incompleto.");
    const content = listing
      .map((entry) => entry.replace(/^\.\//, ""))
      .filter(
        (entry) => !["", ".", "images/", "manifest.json"].includes(entry),
      );
    if (
      content.length !== seen.size ||
      content.some((entry) => !seen.has(entry))
    )
      throw Error("Conteúdo não corresponde ao manifesto.");
    return {
      kind: manifest.kind,
      files: seen.size,
      created_at: manifest.created_at,
    };
  } finally {
    await rm(verification, { recursive: true, force: true });
  }
}
export function keyOutsideDestination(keyPath, directory) {
  const path = relative(
    existsSync(directory) ? realpathSync(directory) : resolve(directory),
    existsSync(keyPath) ? realpathSync(keyPath) : resolve(keyPath),
  );
  if (path !== ".." && !path.startsWith(".." + sep) && !isAbsolute(path))
    throw Error("Guarde a chave fora da pasta de destino dos backups.");
}

export function cleanupArchiveWorkspace(work) {
  if (existsSync(join(work, "gpg")))
    run("gpgconf", ["--kill", "gpg-agent"], {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        GNUPGHOME: join(work, "gpg"),
      },
    });
}
