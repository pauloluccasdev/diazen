import { ReturnLink } from "@/components/return-link";
export default function NotFound() {
  return (
    <section className="welcome">
      <p className="eyebrow">CAMINHO NÃO ENCONTRADO</p>
      <h1>Vamos voltar ao seu dia?</h1>
      <p className="intro">
        Esta página não existe ou não está disponível para você.
      </p>
      <ReturnLink href="/painel">Voltar ao dashboard</ReturnLink>
    </section>
  );
}
