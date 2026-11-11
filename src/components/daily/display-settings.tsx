"use client";
import { useEffect } from "react";
import { ActionForm, useFormFeedback } from "@/components/forms/action-form";
import { clearOfflineData } from "@/lib/offline";
import type { DisplayPreferences } from "@/lib/daily-followup";
import { saveDisplayPreferences } from "@/app/painel/acompanhamento/actions";
function ResetSnapshot() {
  const state = useFormFeedback();
  useEffect(() => {
    if (state.message && !state.error) clearOfflineData();
  }, [state]);
  return null;
}
export function DisplaySettings({ initial }: { initial: DisplayPreferences }) {
  return (
    <section className="content-card" aria-labelledby="display-title">
      <h2 id="display-title">O que quero ver no meu dashboard</h2>
      <p>
        Você pode ocultar indicadores sem apagar os registros. Os módulos
        continuam acessíveis para consulta quando você escolher.
      </p>
      <ActionForm
        action={saveDisplayPreferences}
        submit="Salvar preferências"
        feedbackMode="modal"
      >
        <ResetSnapshot />
        {(
          [
            ["show_weight", "Mostrar peso"],
            ["show_calories", "Mostrar calorias"],
            ["show_photos", "Mostrar acesso às fotos"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="checkbox-label">
            <input name={key} type="checkbox" defaultChecked={initial[key]} />
            {label}
          </label>
        ))}
      </ActionForm>
    </section>
  );
}
