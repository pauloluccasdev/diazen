"use client";
import { useState } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { WaterVolumePicker } from "@/components/water-volume-picker";
import { saveRecord } from "@/app/painel/[modulo]/actions";
import type { WaterContainer } from "@/lib/water-containers";

export function WaterEntryForm({
  initialRequestId,
  date,
  min,
  max,
  preset,
  containers,
}: {
  initialRequestId: string;
  date: string;
  min: string;
  max: string;
  preset?: number;
  containers: WaterContainer[];
}) {
  const [requestId, setRequestId] = useState(initialRequestId);
  const [cleared, setCleared] = useState(false);
  return (
    <ActionForm
      action={saveRecord}
      submit="Salvar registro"
      resetOnSuccess
      feedbackMode="modal"
      fieldsKey={requestId}
      onFeedbackClose={(result) => {
        if (!result.error) {
          setCleared(true);
          setRequestId(crypto.randomUUID());
        }
      }}
    >
      <input type="hidden" name="module" value="agua" />
      <input type="hidden" name="entry_id" value={requestId} />
      <label>
        Data
        <input
          type="date"
          name="logged_on"
          defaultValue={date}
          min={min}
          max={max}
          required
        />
      </label>
      <WaterVolumePicker
        initial={cleared ? "" : (preset ?? "")}
        containers={containers}
      />
      <label>
        Horário (opcional)
        <input name="logged_time" type="time" />
      </label>
    </ActionForm>
  );
}
