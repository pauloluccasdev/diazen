import { FolderPlus, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { WelcomeExperience } from "@/components/auth/welcome-experience";

export default function Home() {
  return (
    <AuthShell welcome>
      <WelcomeExperience />
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
    </AuthShell>
  );
}
