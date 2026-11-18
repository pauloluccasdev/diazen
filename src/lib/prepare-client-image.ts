export async function prepareClientImage(file: File, maxSide = 1600) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Escolha uma imagem de até 25 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler a imagem. Use JPG, PNG ou WebP.");
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("Imagem não suportada.")),
        "image/webp",
        0.82,
      ),
    );
    if (blob.size > 3 * 1024 * 1024)
      throw new Error("Escolha uma imagem menor.");
    return new File([blob], "foto.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
