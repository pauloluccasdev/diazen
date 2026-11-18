import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { optimizeAvatar, MAX_IMAGE_BYTES } from "../../src/lib/images.ts";
import {
  readImageForm,
  ImageRequestError,
} from "../../src/lib/image-request.ts";

test("avatar é WebP pequeno e remove EXIF/orientação sensível", async () => {
  const input = await sharp({
    create: { width: 800, height: 1200, channels: 3, background: "#ffc12e" },
  })
    .jpeg()
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Artist: "dado sintético sensível" } },
    })
    .toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const result = await optimizeAvatar(input),
    meta = await sharp(result).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 320);
  assert.equal(meta.height, 320);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.orientation, undefined);
  assert.ok(result.length <= 256 * 1024);
});
test("avatar rejeita outros formatos, bytes inválidos e excesso de tamanho", async () => {
  for (const input of [
    Buffer.from("arquivo inválido"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    ),
    new Uint8Array(MAX_IMAGE_BYTES + 1),
  ])
    await assert.rejects(optimizeAvatar(input));
  const small = await sharp({
    create: { width: 20, height: 30, channels: 3, background: "#111111" },
  })
    .png()
    .toBuffer();
  const meta = await sharp(await optimizeAvatar(small)).metadata();
  assert.ok(
    meta.width > 0 &&
      meta.width <= 320 &&
      meta.height > 0 &&
      meta.height <= 320,
  );
});
test("parser de imagem aceita multipart real e limita bytes lidos", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array([1, 2, 3])], "synthetic.png", {
      type: "image/png",
    }),
  );
  const parsed = await readImageForm(
    new Request("https://example.test/upload", { method: "POST", body: form }),
  );
  assert.equal(parsed.get("file").size, 3);
  const big = new FormData();
  big.set("file", new File([new Uint8Array(4 * 1024 * 1024)], "big.png"));
  // Materializar o multipart reproduz os bytes da rede sem deixar o produtor
  // assíncrono de FormData do Undici ativo após o cancelamento da leitura.
  const encoded = new Response(big);
  const bytes = await encoded.arrayBuffer();
  await assert.rejects(
    readImageForm(
      new Request("https://example.test/upload", {
        method: "POST",
        headers: encoded.headers,
        body: bytes,
      }),
    ),
    (error) => error instanceof ImageRequestError && error.status === 413,
  );
});
test("parser de imagem rejeita corpo/tipo inválidos sem expor detalhes", async () => {
  await assert.rejects(
    readImageForm(
      new Request("https://example.test/upload", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    ),
    (error) => error.status === 400,
  );
  await assert.rejects(
    readImageForm(
      new Request("https://example.test/upload", {
        method: "POST",
        body: "corpo inválido",
        headers: { "content-type": "multipart/form-data; boundary=xyz" },
      }),
    ),
    (error) => error.status === 400,
  );
});
