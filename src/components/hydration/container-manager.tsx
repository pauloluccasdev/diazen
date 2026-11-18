"use client";
import { useRef, useState } from "react";
import { BottleWine, PencilLine, Plus, Trash2 } from "lucide-react";
import { ActionDisclosure } from "@/components/action-disclosure";
import { ActionForm } from "@/components/forms/action-form";
import {
  saveWaterContainer,
  deleteWaterContainer,
} from "@/app/painel/agua/actions";
import type { WaterContainer } from "@/lib/water-containers";
import { number } from "@/lib/domain";

function Fields({ container }: { container?: WaterContainer }) {
  return (
    <>
      {container && <input type="hidden" name="id" value={container.id} />}
      <label>
        Nome do recipiente
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={container?.name ?? ""}
          placeholder="Ex.: Minha garrafa"
        />
      </label>
      <label>
        Volume do recipiente (ml)
        <input
          name="volume_ml"
          type="number"
          min={1}
          max={5000}
          step={1}
          required
          defaultValue={container?.volume_ml ?? ""}
        />
      </label>
    </>
  );
}

export function ContainerManager({
  containers,
  initiallyOpen = false,
}: {
  containers: WaterContainer[];
  initiallyOpen?: boolean;
}) {
  const [removing, setRemoving] = useState<WaterContainer | null>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const manager = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={manager}
      className="content-card water-container-manager"
      id="recipientes"
      open={initiallyOpen}
    >
      <summary>
        <BottleWine size={23} aria-hidden="true" />
        <span>
          <strong>Recipientes comuns</strong>
          <small>Copos, garrafas e squeezes · {containers.length}/50</small>
        </span>
      </summary>
      <div>
        <p className="field-hint">
          Salvos na sua conta. Alterar ou remover um recipiente preserva os
          consumos anteriores.
        </p>
        {!containers.length && (
          <p>
            Nenhum recipiente salvo. Você pode registrar água com qualquer
            volume.
          </p>
        )}
        <ul className="water-container-list">
          {containers.map((container) => (
            <li key={container.id}>
              <strong>
                {container.name} · {number(container.volume_ml, 0)} ml
              </strong>
              <ActionDisclosure
                title={`Editar recipiente ${container.name}`}
                icon={PencilLine}
              >
                <ActionForm
                  action={saveWaterContainer}
                  submit="Salvar recipiente"
                  feedbackMode="modal"
                >
                  <Fields container={container} />
                </ActionForm>
              </ActionDisclosure>
              <button
                type="button"
                className="button-secondary"
                onClick={(event) => {
                  deleteTrigger.current = event.currentTarget;
                  setRemoving(container);
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                Excluir recipiente {container.name}
              </button>
            </li>
          ))}
        </ul>
        {removing && (
          <section
            className="water-container-confirm"
            aria-label={`Excluir recipiente ${removing.name}`}
          >
            <h3>Excluir “{removing.name}”?</h3>
            <p>Os consumos já registrados serão preservados.</p>
            <ActionForm
              key={removing.id}
              action={deleteWaterContainer}
              submit="Excluir recipiente"
              feedbackMode="modal"
              onFeedbackClose={(result) => {
                if (!result.error) {
                  setRemoving(null);
                  manager.current?.querySelector("summary")?.focus();
                }
              }}
            >
              <input type="hidden" name="id" value={removing.id} />
              <label className="checkbox-label">
                <input type="checkbox" name="confirm" required />
                Confirmo a exclusão somente deste recipiente salvo.
              </label>
            </ActionForm>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setRemoving(null);
                deleteTrigger.current?.focus();
              }}
            >
              Cancelar
            </button>
          </section>
        )}
        {containers.length >= 50 && (
          <p role="status">
            Limite de 50 recipientes alcançado. Você pode editar ou remover um
            cadastro.
          </p>
        )}
        <ActionDisclosure title="Adicionar recipiente" icon={Plus}>
          <ActionForm
            action={saveWaterContainer}
            submit="Salvar recipiente"
            resetOnSuccess
            feedbackMode="modal"
            disabled={containers.length >= 50}
          >
            <Fields />
          </ActionForm>
        </ActionDisclosure>
      </div>
    </details>
  );
}
