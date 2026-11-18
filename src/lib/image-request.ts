export class ImageRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readImageForm(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;/i.test(type))
    throw new ImageRequestError(400, "Escolha uma imagem JPG, PNG ou WebP.");
  const reader = request.body?.getReader();
  if (!reader) throw new ImageRequestError(400, "Arquivo inválido.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4 * 1024 * 1024) {
      await reader.cancel();
      throw new ImageRequestError(413, "Envie uma imagem menor.");
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new ImageRequestError(400, "Não foi possível ler o arquivo.");
  }
}
