"use client";
import { useRef, useState } from "react";
import { GlassWater, Plus } from "lucide-react";
import type { WaterContainer } from "@/lib/water-containers";
export function WaterVolumePicker({
  initial = "",
  initialLabel = "",
  containers = [],
}: {
  initial?: number | "";
  initialLabel?: string;
  containers?: WaterContainer[];
}) {
  const [volume, setVolume] = useState(String(initial));
  const [label, setLabel] = useState(initialLabel);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="water-volume-picker">
      {containers.length > 0 && (
        <label>
          Recipiente salvo
          <select
            defaultValue=""
            onChange={(event) => {
              const container = containers.find(
                (item) => item.id === event.target.value,
              );
              if (container) {
                setVolume(String(container.volume_ml));
                setLabel(container.name);
              }
            }}
          >
            <option value="">Escolha um recipiente ou informe abaixo</option>
            {containers.map((container) => (
              <option key={container.id} value={container.id}>
                {container.name} · {container.volume_ml} ml
              </option>
            ))}
          </select>
        </label>
      )}
      <p>Escolha o volume do seu copo ou informe outra quantidade.</p>
      <div
        className="water-volume-options"
        role="group"
        aria-label="Volumes de água"
      >
        {[100, 125, 150, 200, 250, 300, 350, 400, 500, 600].map((ml) => (
          <button
            key={ml}
            type="button"
            aria-pressed={volume === String(ml)}
            onClick={() => setVolume(String(ml))}
          >
            <GlassWater size={24} aria-hidden="true" />
            <span>{ml} ml</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setVolume("");
            input.current?.focus();
          }}
        >
          <Plus size={24} aria-hidden="true" />
          <span>Outro volume</span>
        </button>
      </div>
      <label>
        Volume (ml)
        <input
          ref={input}
          name="volume_ml"
          type="number"
          min={1}
          max={5000}
          step={1}
          required
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        />
      </label>
      <label>
        Recipiente (opcional)
        <input
          name="container_label"
          maxLength={60}
          placeholder="Ex.: Copo"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <p className="field-hint">
        O consumo é salvo apenas ao confirmar o registro.
      </p>
    </div>
  );
}
