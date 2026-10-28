import type { ReactNode } from "react";
import { WaterVolumePicker } from "@/components/water-volume-picker";
import { ModalityPicker } from "@/components/modality-picker";
import {
  categories,
  measurements,
  nutrients,
  units,
  type Entry,
  type Module,
} from "@/lib/records";
import { today } from "@/lib/domain";
export function RecordFields({
  kind,
  entry,
  min,
  max,
  date,
  foodOnly = false,
  prefix = "",
  foodSuggestions,
}: {
  kind: Module;
  entry?: Entry;
  min?: string;
  max?: string;
  date?: string;
  foodOnly?: boolean;
  prefix?: string;
  foodSuggestions?: ReactNode;
}) {
  const compositionFields = (
    <>
      <label>
        Quantidade de referência na mesma unidade
        <input
          name={prefix + "reference_amount"}
          type="number"
          min="0.001"
          max={100000}
          step="0.001"
          required
          defaultValue={entry?.reference_amount ?? 100}
        />
      </label>
      <p className="muted">
        Informe abaixo os nutrientes da quantidade de referência. Ex.: valores
        do rótulo para 100 g. Deixe em branco o que não souber; zero indica
        valor conhecido.
      </p>
      <div className="form-grid">
        {Object.entries(nutrients).map(([key, label]) => (
          <label key={key}>
            {label} ({key === "kcal" ? "kcal" : "g"})
            <input
              type="number"
              name={prefix + key}
              min={0}
              max={100000}
              step="0.001"
              defaultValue={(entry?.[key as keyof Entry] as number) ?? ""}
            />
          </label>
        ))}
      </div>
      <label>
        Fonte dos valores
        <input
          name={prefix + "source"}
          maxLength={200}
          required
          defaultValue={entry?.source ?? "Informado pelo usuário"}
        />
      </label>
    </>
  );
  return (
    <>
      {!foodOnly && (
        <>
          <input type="hidden" name="module" value={kind} />
          {entry && <input type="hidden" name="id" value={entry.id} />}
          {!entry && (
            <input type="hidden" name="entry_id" value={crypto.randomUUID()} />
          )}
          <label>
            Data
            <input
              name="logged_on"
              type="date"
              required
              defaultValue={entry?.logged_on ?? date ?? today()}
              min={min}
              max={max ?? today()}
            />
          </label>
        </>
      )}
      {kind === "agua" && (
        <>
          <div className="form-grid">
            <WaterVolumePicker initial={entry?.volume_ml ?? ""} />
            <label>
              Horário (opcional)
              <input
                type="time"
                name="logged_time"
                defaultValue={entry?.logged_time?.slice(0, 5) ?? ""}
              />
            </label>
          </div>
          <label>
            Recipiente (opcional)
            <input
              name="container_label"
              maxLength={60}
              placeholder="Ex.: Copo"
              defaultValue={entry?.container_label ?? ""}
            />
          </label>
        </>
      )}
      {kind === "peso" && (
        <label>
          Peso (kg)
          <input
            name="kg"
            type="number"
            min={20}
            max={500}
            step="0.01"
            required
            defaultValue={entry?.kg ?? ""}
          />
        </label>
      )}
      {kind === "medidas" &&
        (!entry ? (
          <div className="form-grid">
            {Object.entries(measurements).map(([key, label]) => (
              <label key={key}>
                {label} (cm)
                <input name={key} type="number" min={1} max={300} step="0.01" />
              </label>
            ))}
          </div>
        ) : (
          <>
            <input
              type="hidden"
              name="measurement_type"
              value={entry.measurement_type}
            />
            <label>
              {measurements[entry.measurement_type!]} (cm)
              <input
                name="value_cm"
                type="number"
                min={1}
                max={300}
                step="0.01"
                required
                defaultValue={entry.value_cm}
              />
            </label>
          </>
        ))}
      {kind === "atividades" && (
        <>
          <label>
            Título (opcional)
            <input
              name="name"
              maxLength={200}
              defaultValue={entry?.name ?? ""}
            />
          </label>
          <ModalityPicker initial={entry?.modality} />
          <div className="form-grid">
            <label>
              Duração (minutos)
              <input
                name="duration_min"
                type="number"
                required
                min="0.01"
                max={1440}
                step="0.01"
                defaultValue={entry?.duration_min ?? ""}
              />
            </label>
            <label>
              Distância (km)
              <input
                name="distance_km"
                type="number"
                min={entry?.external_provider === "garmin" ? "0" : "0.001"}
                max={1000}
                step="0.001"
                defaultValue={entry?.distance_km ?? ""}
              />
            </label>
          </div>
          <label>
            Calorias da atividade (kcal, opcional)
            <input
              name="kcal"
              type="number"
              min="0"
              max="100000"
              step="0.01"
              defaultValue={entry?.kcal ?? ""}
            />
          </label>
          <p className="muted">
            {entry?.external_provider === "garmin"
              ? "Você pode revisar os dados importados. Distância e calorias não informadas pela Garmin podem permanecer em branco."
              : "Distância obrigatória para corrida, ciclismo e natação. Na musculação e em outras atividades, basta informar a duração."}
          </p>
          <label>
            Descrição (opcional)
            <textarea
              name="notes"
              maxLength={1000}
              defaultValue={entry?.notes ?? ""}
            />
          </label>
        </>
      )}
      {kind === "alimentacao" && (
        <>
          {!foodOnly && (
            <label>
              Refeição
              <select
                name="category"
                defaultValue={entry?.category ?? "breakfast"}
              >
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Alimento
            <input
              name={prefix + "name"}
              maxLength={120}
              required
              defaultValue={entry?.name ?? ""}
            />
          </label>
          {foodSuggestions}
          <div className="form-grid">
            <label>
              Quantidade consumida
              <input
                name={prefix + "amount"}
                type="number"
                min="0.001"
                max={100000}
                step="0.001"
                required
                defaultValue={entry?.amount ?? ""}
              />
            </label>
            <label>
              Unidade
              <select name={prefix + "unit"} defaultValue={entry?.unit ?? "g"}>
                {Object.entries(units).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {foodOnly ? (
            <details className="manual-food-details">
              <summary>Conferir composição e fonte</summary>
              {compositionFields}
            </details>
          ) : (
            compositionFields
          )}
        </>
      )}
    </>
  );
}
