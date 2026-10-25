"use client";
import { useEffect, useRef } from "react";
export function PlanSavedDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="plan-saved-dialog"
      aria-labelledby="plan-saved-title"
      onClose={onClose}
    >
      <h2 id="plan-saved-title">Plano salvo com sucesso</h2>
      <p>
        Sua versão foi salva e já está disponível para consulta e comparação no
        dashboard.
      </p>
      <p>O consumo do diário permanece separado do planejamento.</p>
      <button type="button" className="button-primary" onClick={onClose}>
        Entendi
      </button>
    </dialog>
  );
}
