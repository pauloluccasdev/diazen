import Link from "next/link";
import {
  ArrowRight,
  FolderPlus,
  Utensils,
  Droplets,
  Dumbbell,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react";

const areas = [
  {
    title: "Alimentação",
    detail: "Suas refeições, no seu ritmo.",
    icon: Utensils,
  },
  {
    title: "Hidratação",
    detail: "Cada copo faz parte do caminho.",
    icon: Droplets,
  },
  {
    title: "Atividades",
    detail: "Um espaço para seus movimentos.",
    icon: Dumbbell,
  },
  {
    title: "Evolução",
    detail: "Peso, medidas e fotos da sua jornada.",
    icon: ChartNoAxesCombined,
  },
];

export default function Home() {
  return (
    <div className="opening-page">
      <section className="opening-hero" aria-labelledby="welcome-title">
        <div className="opening-content">
          <h1 id="welcome-title" className="brand opening-brand">
            dia<span>zen.</span>
          </h1>
          <p className="auth-tagline">Sua rotina. Sua evolução.</p>
          <div className="area-grid opening-areas">
            {areas.map(({ title, detail, icon: Icon }) => (
              <article key={title}>
                <span className="icon-box">
                  <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="opening-actions">
            <Link className="button-primary" href="/cadastro">
              Começar minha jornada <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button-secondary" href="/entrar">
              Já tenho uma conta
            </Link>
            <a className="back-link" href="#primeiros-passos">
              Conhecer os primeiros passos
            </a>
          </div>
        </div>
      </section>
      <section
        className="getting-started"
        id="primeiros-passos"
        aria-labelledby="steps-title"
      >
        <div className="steps-heading">
          <FolderPlus size={24} aria-hidden="true" />
          <div>
            <p className="eyebrow">SEU COMEÇO</p>
            <h2 id="steps-title">Pequenos passos, um novo ritmo.</h2>
          </div>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <div>
              <h3>Crie seu espaço</h3>
              <p>Sua conta mantém sua jornada pessoal e privada.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Escolha uma meta</h3>
              <p>Comece um projeto com pelo menos uma meta mensurável.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Registre o seu dia</h3>
              <p>Acompanhe alimentação, água, atividades e evolução.</p>
            </div>
          </li>
        </ol>
        <p className="preview-note">
          Comece com uma meta e registre o que fizer sentido para você. O Diazen
          organiza sua rotina, sem prescrever dietas ou treinos.
        </p>
      </section>
      <p className="privacy-note">
        <ShieldCheck size={18} aria-hidden="true" />
        Sua jornada é pessoal. Seus dados também.
      </p>
    </div>
  );
}
