"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, X } from "lucide-react";
import { useOnline } from "@/lib/use-online";
import { prepareClientImage } from "@/lib/prepare-client-image";
import { RecordFeedbackDialog } from "@/components/record-feedback-dialog";

export function AvatarEditor({
  avatarId,
  initiallyOpen = false,
}: {
  avatarId: string | null;
  initiallyOpen?: boolean;
}) {
  const router = useRouter(),
    online = useOnline(),
    id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false),
    [selected, setSelected] = useState<{ file: File; preview: string } | null>(
      null,
    ),
    [feedback, setFeedback] = useState<{
      message: string;
      error: boolean;
    } | null>(null),
    [removing, setRemoving] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.preview);
    },
    [selected],
  );
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !online || !selected) return;
    setPending(true);
    try {
      const body = new FormData();
      body.set("file", await prepareClientImage(selected.file, 512));
      const response = await fetch("/api/perfil/avatar", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.message ?? "Não foi possível salvar sua foto.");
      form.current?.reset();
      setSelected(null);
      router.refresh();
      setFeedback({ message: result.message, error: false });
    } catch (error) {
      router.refresh();
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar sua foto. Tente novamente.",
        error: true,
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="profile-avatar-editor">
      <details id="profile-avatar" open={initiallyOpen}>
        <summary>
          <Camera size={18} aria-hidden="true" />
          Adicionar ou trocar foto
        </summary>
        <form ref={form} onSubmit={upload}>
          <fieldset disabled={pending || !online}>
            {selected && (
              <Image
                unoptimized
                className="profile-avatar-preview"
                src={selected.preview}
                alt="Pré-visualização da foto selecionada"
                width={160}
                height={160}
              />
            )}
            <label htmlFor={id}>Foto de perfil (JPG, PNG ou WebP)</label>
            <input
              id={id}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelected(
                  file ? { file, preview: URL.createObjectURL(file) } : null,
                );
              }}
            />
            <p className="field-hint">
              Escolha uma imagem de até 25 MB. O Diazen prepara uma versão
              pequena e privada para o perfil.
            </p>
            <button type="submit" className="button-primary">
              {pending ? "Enviando…" : "Salvar foto de perfil"}
            </button>
          </fieldset>
        </form>
      </details>
      {avatarId && (
        <button
          type="button"
          className="button-secondary profile-avatar-remove"
          disabled={pending || !online}
          onClick={() => setRemoving(avatarId)}
        >
          <Trash2 size={17} aria-hidden="true" />
          Remover foto de perfil
        </button>
      )}
      {!online && (
        <p role="status">Sem conexão. As alterações estão bloqueadas.</p>
      )}
      {removing && (
        <AvatarRemoval
          version={removing}
          close={() => setRemoving(null)}
          complete={(message, error) => {
            setFeedback({ message, error });
            if (!error) {
              setRemoving(null);
              router.refresh();
            } else router.refresh();
          }}
        />
      )}
      {feedback && (
        <RecordFeedbackDialog
          message={feedback.message}
          error={feedback.error}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}

function AvatarRemoval({
  version,
  close,
  complete,
}: {
  version: string;
  close: () => void;
  complete: (message: string, error: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    id = useId(),
    online = useOnline();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    cancel.current?.focus({ preventScroll: true });
  }, []);
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !online) return;
    setPending(true);
    try {
      const response = await fetch("/api/perfil/avatar", {
        method: "DELETE",
        headers: {
          "x-diazen-confirmation": "remover-avatar",
          "x-diazen-avatar-id": version,
        },
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.message ?? "Não foi possível remover sua foto.");
      dialog.current?.close();
      complete(result.message, false);
    } catch (error) {
      complete(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a remoção.",
        true,
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="record-feedback-dialog profile-avatar-confirm"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onClose={close}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <span className="record-feedback-icon">
        <Trash2 size={28} aria-hidden="true" />
      </span>
      <h2 id={`${id}-title`}>Remover foto de perfil?</h2>
      <p id={`${id}-description`}>
        Remova a foto atual do seu perfil. Você poderá adicionar outra quando
        quiser.
      </p>
      <form onSubmit={remove}>
        <fieldset disabled={pending || !online}>
          <label className="checkbox-label">
            <input type="checkbox" required />
            Confirmo a remoção desta foto de perfil.
          </label>
          <div className="profile-confirm-actions">
            <button
              ref={cancel}
              className="button-secondary"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              <X size={17} aria-hidden="true" />
              Cancelar
            </button>
            <button className="button-primary" type="submit">
              {pending ? "Removendo…" : "Confirmar remoção"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
