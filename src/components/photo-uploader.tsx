"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/lib/use-online";
import { today } from "@/lib/domain";
async function prepare(file: File) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error("Escolha uma imagem de até 25 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler a imagem. Use JPG, PNG ou WebP.");
  }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
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
export function PhotoUploader({ min, max }: { min: string; max: string }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const online = useOnline(),
    router = useRouter();
  return (
    <form
      className="data-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || !navigator.onLine) return;
        const element = event.currentTarget,
          form = new FormData(element),
          file = form.get("file");
        if (!(file instanceof File) || !file.size) return;
        setPending(true);
        setError("");
        setMessage("Preparando sua foto…");
        try {
          form.set("file", await prepare(file));
          if (!navigator.onLine)
            throw new Error("Conecte-se à internet para salvar a foto.");
          const response = await fetch("/api/fotos", {
            method: "POST",
            body: form,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.message ?? "Não foi possível salvar a foto.",
            );
          setMessage("Foto salva com privacidade.");
          element.reset();
          router.refresh();
        } catch (reason) {
          setMessage("");
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível salvar. Use JPG, PNG ou WebP.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending || !online}>
        <label>
          Data da foto
          <input
            type="date"
            name="logged_on"
            required
            min={min}
            max={max}
            defaultValue={today()}
          />
        </label>
        <label>
          Categoria
          <select name="category">
            <option value="front">Frente</option>
            <option value="back">Costas</option>
            <option value="side">Lateral</option>
            <option value="other">Outras</option>
          </select>
        </label>
        <label>
          Imagem (JPG, PNG ou WebP)
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <p className="intro">
          Suas fotos são privadas e otimizadas. Envie uma imagem de até 25 MB;
          localização e outros metadados não serão armazenados.
        </p>
        <button className="button-primary" type="submit">
          {pending ? "Salvando…" : "Salvar foto"}
        </button>
      </fieldset>
      {message && (
        <p role="status" className="form-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!online && <p role="status">Sem conexão. O envio está bloqueado.</p>}
    </form>
  );
}
