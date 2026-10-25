export default function Loading() {
  return (
    <section
      className="app-loading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="brand loading-brand" aria-hidden="true">
        dia<span>zen.</span>
      </div>
      <span className="sr-only">Carregando seu diário…</span>
    </section>
  );
}
