"use client";
import { useRef, useState } from "react";
import type { PlanAsset } from "@/lib/phase-plans";
import type { ProjectPhase } from "@/lib/daily-followup";
export function PlanReferences({
  phases,
  assets,
  phase,
  image,
  onPhase,
  onImage,
  disabled,
}: {
  phases: ProjectPhase[];
  assets: PlanAsset[];
  phase: string;
  image: string;
  onPhase: (id: string) => void;
  onImage: (id: string) => void;
  disabled: boolean;
}) {
  const [items, setItems] = useState(assets),
    [message, setMessage] = useState(""),
    [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="plan-reference-fields">
      <label>
        Fase (opcional)
        <select
          value={phase}
          disabled={disabled}
          onChange={(e) => onPhase(e.target.value)}
        >
          <option value="">Sem fase específica</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.starts_on} a {p.ends_on}
            </option>
          ))}
        </select>
      </label>
      <label>
        Imagem de referência (opcional)
        <select
          value={image}
          disabled={disabled || uploading}
          onChange={(e) => onImage(e.target.value)}
        >
          <option value="">Sem imagem</option>
          {items.map((asset) => (
            <option value={asset.id} key={asset.id}>
              {asset.name}
            </option>
          ))}
        </select>
      </label>
      {image && (
        <a
          href={`/api/planos/referencias/${image}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir referência privada
        </a>
      )}
      <details>
        <summary>Enviar imagem de referência</summary>
        <p className="field-hint">
          JPG, PNG ou WebP, até 3 MB. A imagem é otimizada e fica privada; os
          dados do plano precisam ser preenchidos e revisados por você. Não há
          leitura automática.
        </p>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Imagem do plano"
          disabled={disabled || uploading}
        />
        <button
          type="button"
          className="button-secondary"
          disabled={disabled || uploading}
          onClick={async () => {
            const selected = file.current?.files?.[0];
            if (!selected) {
              setMessage("Selecione uma imagem.");
              return;
            }
            if (selected.size > 3 * 1024 * 1024) {
              setMessage("Envie uma imagem de até 3 MB.");
              return;
            }
            setUploading(true);
            setMessage("Enviando referência…");
            try {
              const body = new FormData();
              body.set("file", selected);
              body.set("name", selected.name.slice(0, 120));
              const r = await fetch("/api/planos/referencias", {
                method: "POST",
                body,
              });
              const result = await r.json();
              if (!r.ok)
                throw Error(result.message ?? "Não foi possível enviar.");
              setItems((v) => [
                ...v,
                { id: result.id, name: result.name, storage_key: "" },
              ]);
              onImage(result.id);
              setMessage(
                "Referência salva. Confira os dados antes de salvar a versão.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Não foi possível enviar.",
              );
            } finally {
              setUploading(false);
            }
          }}
        >
          {uploading ? "Enviando…" : "Salvar referência privada"}
        </button>
        <p role="status">{message}</p>
      </details>
    </div>
  );
}
