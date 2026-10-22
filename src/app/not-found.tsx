import Link from "next/link";
export default function NotFound() {
  return (
    <section className="welcome">
      <p className="eyebrow">CAMINHO NÃO ENCONTRADO</p>
      <h1>Vamos voltar ao seu dia?</h1>
      <p className="intro">
        Esta página não existe ou não está disponível para você.
      </p>
      <Link className="button-primary" href="/painel">
        Voltar ao dashboard
      </Link>
    </section>
  );
}
