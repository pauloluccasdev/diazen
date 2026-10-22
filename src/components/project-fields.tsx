"use client";

import { useId, useState, type ComponentPropsWithoutRef } from "react";
import { useFormFeedback } from "./forms/action-form";
import type { WeightMode } from "@/lib/project-validation";

type ProjectInputProps = ComponentPropsWithoutRef<"input"> & {
  name: string;
  label: string;
};
function ProjectInput({ name, label, required, ...props }: ProjectInputProps) {
  const id = useId();
  const { fieldErrors = {} } = useFormFeedback();
  const error = fieldErrors[name];
  const description =
    [props["aria-describedby"], error ? `${id}-error` : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="project-field">
      <label htmlFor={id}>
        <span>
          <span id={`${id}-label`}>{label}</span>
          {required && (
            <span aria-hidden="true" className="required-mark">
              {" "}
              *
            </span>
          )}
        </span>
      </label>
      <input
        {...props}
        id={id}
        name={name}
        aria-labelledby={`${id}-label`}
        required={required}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={description}
      />
      {error && (
        <p className="form-error field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ProjectGoalFields({
  mode: initial = "none",
  min,
  max,
}: {
  mode?: WeightMode;
  min?: number | null;
  max?: number | null;
}) {
  const [mode, setMode] = useState<WeightMode>(initial);
  const prefix = useId();
  return (
    <>
      <label>
        Acompanhamento de peso
        <select
          name="weight_mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as WeightMode)}
          aria-describedby={`${prefix}-weight-help`}
        >
          <option value="none">Sem meta de peso</option>
          <option value="track">Apenas acompanhar</option>
          <option value="target">Peso alvo</option>
          <option value="range">Faixa de peso</option>
        </select>
      </label>
      <p className="field-hint" id={`${prefix}-weight-help`}>
        {mode === "track"
          ? "Apenas acompanhar: registre seu peso sem definir alvo ou faixa. Para ativar o projeto, configure uma meta de água ou de sessões semanais."
          : mode === "none"
            ? "Sem valores de peso a preencher. Para ativar, configure uma meta de água ou de sessões semanais."
            : mode === "target"
              ? "O peso alvo é obrigatório neste modo. O máximo da faixa não se aplica."
              : "Informe os dois limites da faixa. O máximo deve ser maior ou igual ao mínimo."}
      </p>
      {(mode === "target" || mode === "range") && (
        <div className="form-grid">
          <ProjectInput
            label="Alvo ou mínimo (kg)"
            name="weight_min"
            type="number"
            required
            min={20}
            max={500}
            step="0.01"
            defaultValue={min ?? ""}
          />
          {mode === "range" && (
            <ProjectInput
              label="Máximo da faixa (kg)"
              name="weight_max"
              type="number"
              required
              min={20}
              max={500}
              step="0.01"
              defaultValue={max ?? ""}
            />
          )}
        </div>
      )}
    </>
  );
}

export function ProjectCreateFields({ today }: { today: string }) {
  const prefix = useId();
  const [draft, setDraft] = useState(false);
  const [start, setStart] = useState(today);
  const { fieldErrors = {} } = useFormFeedback();
  const future = start > today;
  return (
    <>
      <p className="field-hint">
        * Campos obrigatórios. Para ativar, configure ao menos uma meta de água,
        sessões semanais ou peso alvo/faixa.
      </p>
      <ProjectInput
        label="Nome do projeto"
        name="name"
        required
        maxLength={100}
        placeholder="Ex.: Minha jornada"
      />
      <div className="form-grid">
        <ProjectInput
          label="Início"
          type="date"
          name="starts_on"
          required
          defaultValue={today}
          onChange={(e) => setStart(e.target.value)}
          aria-describedby={`${prefix}-start-help`}
        />
        <ProjectInput
          label="Fim previsto (opcional)"
          type="date"
          name="ends_on"
          min={start || undefined}
        />
      </div>
      <p className="field-hint" id={`${prefix}-start-help`}>
        {future
          ? "Projeto planejado: será salvo como rascunho. A partir da data de início, você poderá ativá-lo em Projetos. A ativação não é automática."
          : "Projetos com início futuro são salvos como rascunho para você planejar com antecedência."}
      </p>
      <div className="form-grid">
        <ProjectInput
          label="Meta diária de água (ml)"
          name="water_ml"
          type="number"
          min={100}
          max={15000}
          step={1}
        />
        <div>
          <ProjectInput
            label="Sessões por semana"
            name="sessions"
            type="number"
            min={1}
            max={50}
            step={1}
            aria-describedby={`${prefix}-sessions-help`}
          />
          <p className="field-hint" id={`${prefix}-sessions-help`}>
            Meta opcional de atividades físicas na semana. Cada atividade
            registrada conta como uma sessão, independentemente da modalidade.
            Exemplo: 3 treinos de musculação + 2 corridas = 5 sessões. Deixe em
            branco se não quiser definir essa meta.
          </p>
        </div>
      </div>
      <ProjectGoalFields />
      {fieldErrors.goals && (
        <p className="form-error field-error">{fieldErrors.goals}</p>
      )}
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="draft"
          checked={draft}
          onChange={(e) => setDraft(e.target.checked)}
        />
        Salvar como rascunho, sem ativar
      </label>
    </>
  );
}
