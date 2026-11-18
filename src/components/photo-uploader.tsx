"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnline } from "@/lib/use-online";
import { today } from "@/lib/domain";
import { RecordFeedbackDialog } from "@/components/record-feedback-dialog";
import { prepareClientImage } from "@/lib/prepare-client-image";
export function PhotoUploader({
  min,
  max,
  date,
}: {
  min: string;
  max: string;
  date?: string;
}) {
  const requestedDate = date ?? today();
  const initialDate =
    requestedDate > max ? max : requestedDate < min ? min : requestedDate;
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
          form.set("file", await prepareClientImage(file));
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
            defaultValue={initialDate}
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
      {pending && message && <p role="status">{message}</p>}
      {!pending && (message || error) && (
        <RecordFeedbackDialog
          message={error || message}
          error={Boolean(error)}
          onClose={() => {
            setMessage("");
            setError("");
          }}
        />
      )}
      {!online && <p role="status">Sem conexão. O envio está bloqueado.</p>}
    </form>
  );
}
