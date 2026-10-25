"use client";

import { useState } from "react";
import {
  Bike,
  Dumbbell,
  Footprints,
  Waves,
  Check,
  Activity,
} from "lucide-react";
import { modalities } from "@/lib/records";

const icons = {
  strength: Dumbbell,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  other: Activity,
};

export function ModalityPicker({
  initial = "strength",
}: {
  initial?: keyof typeof modalities;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="modality-picker">
      <label>
        Modalidade
        <select
          name="modality"
          value={value}
          onChange={(event) =>
            setValue(event.target.value as keyof typeof modalities)
          }
        >
          {Object.entries(modalities).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div
        className="modality-options"
        role="group"
        aria-label="Opções de atividade"
      >
        {Object.entries(modalities).map(([key, label]) => {
          const Icon = icons[key as keyof typeof modalities];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={value === key}
              onClick={() => setValue(key as keyof typeof modalities)}
            >
              <span className="icon-box">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span>{label}</span>
              {value === key && <Check size={16} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
