"use client";
import { useState } from "react";
import { units } from "@/lib/records";
export function FoodUnitSelect({
  prefix = "",
  initial = "g",
}: {
  prefix?: string;
  initial?: keyof typeof units;
}) {
  const [changed, setChanged] = useState(false);
  return (
    <>
      <select
        aria-label="Unidade"
        name={prefix + "unit"}
        defaultValue={initial}
        onChange={(event) => {
          const form = event.currentTarget.form;
          for (const key of ["kcal", "protein", "carbs", "fat"]) {
            const input = form?.elements.namedItem(
              prefix + key,
            ) as HTMLInputElement | null;
            if (input) input.value = "";
          }
          const source = form?.elements.namedItem(
            prefix + "source",
          ) as HTMLInputElement | null;
          if (source) source.value = "Informado pelo usuário";
          const reference = form?.elements.namedItem(
            prefix + "reference_amount",
          ) as HTMLInputElement | null;
          if (reference) reference.value = "100";
          setChanged(true);
          event.currentTarget.dispatchEvent(
            new Event("input", { bubbles: true }),
          );
        }}
      >
        {Object.entries(units).map(([key, label]) => (
          <option value={key} key={key}>
            {label}
          </option>
        ))}
      </select>
      {changed && (
        <span className="field-hint">
          Unidade alterada. Confira a quantidade e informe uma composição nessa
          unidade; não há conversão automática.
        </span>
      )}
    </>
  );
}
