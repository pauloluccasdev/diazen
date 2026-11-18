import sharp from "sharp";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
async function decodedImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Imagem muito grande.");
  const header = Buffer.from(bytes.subarray(0, 12));
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = header
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    header.toString("ascii", 0, 4) === "RIFF" &&
    header.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) throw Error("Formato não suportado.");
  const image = sharp(bytes, {
    limitInputPixels: 40_000_000,
    failOn: "error",
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Formato não suportado.");
  return image;
}
export async function optimizePhoto(bytes: Uint8Array) {
  const image = await decodedImage(bytes);
  const full = await image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  const thumbnail = await sharp(full)
    .resize({
      width: 360,
      height: 360,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 76 })
    .toBuffer();
  if (full.length > MAX_IMAGE_BYTES) throw new Error("Imagem muito grande.");
  return { full, thumbnail };
}

export async function optimizeAvatar(bytes: Uint8Array) {
  const image = await decodedImage(bytes);
  const result = await image
    .rotate()
    .resize({
      width: 320,
      height: 320,
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  if (result.length > 256 * 1024) throw Error("Imagem muito grande.");
  return result;
}
