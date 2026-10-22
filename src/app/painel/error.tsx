"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="welcome"><h1>Não foi possível carregar.</h1><p className="intro">Seus dados não foram alterados. Confira a conexão e tente novamente.</p><button className="button-primary" onClick={reset}>Tentar novamente</button></section>;
}
