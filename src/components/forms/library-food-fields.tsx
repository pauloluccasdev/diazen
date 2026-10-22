import { nutrients, units } from "@/lib/records";
import type { LibraryFood } from "@/lib/food-library";
export function LibraryFoodFields({ food }: { food?: LibraryFood }) {
  return (
    <>
      <input
        type="hidden"
        name="food_id"
        value={food?.id ?? crypto.randomUUID()}
      />
      <input type="hidden" name="editing" value={String(!!food)} />
      <label>
        Nome do alimento
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={food?.name ?? ""}
        />
      </label>
      <div className="form-grid">
        <label>
          Quantidade de referência
          <input
            name="reference_amount"
            type="number"
            min="0.001"
            max={100000}
            step="0.001"
            required
            defaultValue={food?.reference_amount ?? 100}
          />
        </label>
        <label>
          Unidade
          <select name="unit" defaultValue={food?.unit ?? "g"}>
            {Object.entries(units).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Valores para a quantidade de referência. Deixe desconhecidos em branco;
        zero é um valor conhecido.
      </p>
      <div className="form-grid">
        {Object.entries(nutrients).map(([key, label]) => (
          <label key={key}>
            {label} ({key === "kcal" ? "kcal" : "g"})
            <input
              name={key}
              type="number"
              min={0}
              max={100000}
              step="0.001"
              defaultValue={food?.[key as keyof typeof nutrients] ?? ""}
            />
          </label>
        ))}
      </div>
      <label>
        Fonte dos valores
        <input
          name="source"
          maxLength={200}
          required
          defaultValue={food?.source ?? "Informado pelo usuário"}
        />
      </label>
    </>
  );
}
