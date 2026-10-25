"use client";
import { useRef, useState } from "react";
import { GlassWater, Plus } from "lucide-react";
export function WaterVolumePicker({ initial = "" }: { initial?: number | "" }) {
  const [volume, setVolume] = useState(String(initial));
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="water-volume-picker">
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
      <p className="field-hint">
        O consumo é salvo apenas ao confirmar o registro.
      </p>
    </div>
  );
}
