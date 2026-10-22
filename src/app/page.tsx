import Link from "next/link";
import { ArrowRight, FolderPlus, Utensils, Droplets, Dumbbell, ChartNoAxesCombined, ShieldCheck } from "lucide-react";

const areas = [
  { title: "Alimentação", detail: "Suas refeições, no seu ritmo.", icon: Utensils },
  { title: "Hidratação", detail: "Cada copo faz parte do caminho.", icon: Droplets },
  { title: "Atividades", detail: "Um espaço para seus movimentos.", icon: Dumbbell },
  { title: "Evolução", detail: "Peso, medidas e fotos da sua jornada.", icon: ChartNoAxesCombined },
];

export default function Home() {
  return (
    <>
      <Link className="back-link" href="/entrar">Entrar na minha conta →</Link>
      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">SUA ROTINA. SUA EVOLUÇÃO.</p>
        <h1 id="welcome-title">Seu próximo passo<br />começa com você<span className="accent">.</span></h1>
        <p className="intro">Um espaço para acompanhar o que você faz hoje<br className="desktop-break" /> e enxergar sua evolução ao longo do tempo.</p>
      </section>
      <section className="project-card" aria-labelledby="project-title">
        <div className="project-content">
          <span className="status">SEU DIÁRIO PESSOAL</span>
          <h2 id="project-title">Toda evolução tem<br />um ponto de partida.</h2>
          <p>Organize suas metas em um projeto e reúna seus registros em um só lugar.</p>
          <Link className="button-primary" href="/cadastro">Começar minha jornada<ArrowRight size={18} aria-hidden="true" /></Link><br /><a className="back-link" href="#primeiros-passos">Conhecer os primeiros passos</a>
        </div>
        <div className="project-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><ChartNoAxesCombined size={56} strokeWidth={1.25} /></div><span className="art-label">UM DIA DE CADA VEZ</span></div>
      </section>
      <section className="areas-section" aria-labelledby="areas-title">
        <div className="section-heading"><h2 id="areas-title">Seu dia, por inteiro</h2><span>Quatro áreas. Uma jornada.</span></div>
        <div className="area-grid">{areas.map(({ title, detail, icon: Icon }) => (
          <article className="area-card" key={title}>
            <span className="icon-box"><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
            <h3>{title}</h3><p>{detail}</p>
          </article>
        ))}</div>
      </section>
      <section className="getting-started" id="primeiros-passos" aria-labelledby="steps-title">
        <div className="steps-heading"><FolderPlus size={24} aria-hidden="true" /><div><p className="eyebrow">SEU COMEÇO</p><h2 id="steps-title">Pequenos passos, um novo ritmo.</h2></div></div>
        <ol className="steps"><li><span>01</span><div><h3>Crie seu espaço</h3><p>Sua conta mantém sua jornada pessoal e privada.</p></div></li><li><span>02</span><div><h3>Escolha uma meta</h3><p>Comece um projeto com pelo menos uma meta mensurável.</p></div></li><li><span>03</span><div><h3>Registre o seu dia</h3><p>Acompanhe alimentação, água, atividades e evolução.</p></div></li></ol>
        <p className="preview-note">Comece com uma meta e registre o que fizer sentido para você. O Diazen organiza sua rotina, sem prescrever dietas ou treinos.</p>
      </section>
      <p className="privacy-note"><ShieldCheck size={18} aria-hidden="true" />Sua jornada é pessoal. Seus dados também.</p>
    </>
  );
}
