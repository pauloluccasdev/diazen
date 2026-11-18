"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  ImageOff,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  ZoomIn,
} from "lucide-react";
import { formatDate } from "@/lib/domain";
import { photoPoses, type PhotoMetadata } from "@/lib/photo-metrics";

function PhotoDialog({
  photo,
  onClose,
}: {
  photo: PhotoMetadata;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    close = useRef<HTMLButtonElement>(null),
    title = useId();
  const [zoom, setZoom] = useState(false),
    [error, setError] = useState(false),
    [version, setVersion] = useState(0),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    close.current?.focus({ preventScroll: true });
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-viewer"
      aria-labelledby={title}
      onClose={onClose}
    >
      <header>
        <div>
          <h2 id={title}>{photoPoses[photo.category]}</h2>
          <p>{formatDate(photo.logged_on)} · fotografia privada</p>
        </div>
        <button
          ref={close}
          type="button"
          className="photo-viewer-close"
          aria-label="Fechar fotografia"
          onClick={() => dialog.current?.close()}
        >
          <X size={23} aria-hidden="true" />
        </button>
      </header>
      <div
        className={`photo-viewer-stage${zoom ? " is-zoomed" : ""}`}
        tabIndex={0}
        role="region"
        aria-busy={!loaded && !error}
        aria-label="Visualização ampliada da fotografia"
      >
        {error ? (
          <div className="photo-image-error">
            <ImageOff size={32} aria-hidden="true" />
            <p role="alert">Não foi possível carregar esta fotografia.</p>
            <button
              className="button-secondary"
              type="button"
              onClick={() => {
                setVersion((v) => v + 1);
                setLoaded(false);
                setError(false);
              }}
            >
              <RotateCw size={18} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <Image
            key={version}
            unoptimized
            className="photo-viewer-image"
            src={`/api/fotos/${photo.id}`}
            width={1600}
            height={1600}
            alt={`${photoPoses[photo.category]} em ${formatDate(photo.logged_on)}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
        {!loaded && !error && (
          <span className="photo-image-loading" aria-hidden="true">
            Carregando fotografia…
          </span>
        )}
      </div>
      <footer>
        <button
          className="button-secondary"
          type="button"
          aria-pressed={zoom}
          disabled={error || !loaded}
          onClick={() => setZoom((v) => !v)}
        >
          {zoom ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
          {zoom ? "Ajustar à tela" : "Ampliar imagem"}
        </button>
        <a
          href={`/api/fotos/${photo.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir arquivo privado
        </a>
      </footer>
    </dialog>
  );
}
export function PhotoImage({
  photo,
  thumbnail = true,
}: {
  photo: PhotoMetadata;
  thumbnail?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(false),
    [loaded, setLoaded] = useState(false);
  return (
    <>
      <button
        type="button"
        className="photo-image-button"
        aria-busy={!loaded && !error}
        aria-label={`Ampliar foto ${photoPoses[photo.category]} de ${formatDate(photo.logged_on)}`}
        onClick={() => setOpen(true)}
      >
        {error ? (
          <span className="photo-image-placeholder">
            <ImageOff size={28} aria-hidden="true" />
            <span>Visualizar fotografia</span>
          </span>
        ) : (
          <Image
            unoptimized
            src={`/api/fotos/${photo.id}${thumbnail ? "?miniatura=1" : ""}`}
            width={thumbnail ? 360 : 1600}
            height={thumbnail ? 360 : 1600}
            alt={`${photoPoses[photo.category]} em ${formatDate(photo.logged_on)}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
        {!loaded && !error && (
          <span className="photo-image-loading" aria-hidden="true" />
        )}
        <span className="photo-image-expand">
          <ZoomIn size={17} aria-hidden="true" />
        </span>
      </button>
      {open && <PhotoDialog photo={photo} onClose={() => setOpen(false)} />}
    </>
  );
}
