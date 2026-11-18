"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Utensils, Dumbbell, Droplet, ChartNoAxesCombined } from "lucide-react";
import { AuthBrand } from "./auth-frame";

const slides = [
  {
    title: "Evolução com",
    accent: "método e rotina.",
    description:
      "Acompanhe sua alimentação, treinos, hidratação e evolução corporal em um só lugar.",
  },
  {
    title: "Seu dia,",
    accent: "no seu ritmo.",
    description:
      "Registre o que fez, adapte o que precisar e retome quando fizer sentido para você.",
  },
  {
    title: "Uma rotina",
    accent: "de cada vez.",
    description:
      "Reveja seu histórico e perceba sua evolução ao longo do tempo, sem cobranças ou comparações.",
  },
];
const areas = [
  { title: "Alimentação", icon: Utensils },
  { title: "Treinos", icon: Dumbbell },
  { title: "Hidratação", icon: Droplet },
  { title: "Evolução corporal", icon: ChartNoAxesCombined },
];
export function WelcomeExperience() {
  const [selected, setSelected] = useState(0);
  const slide = slides[selected];
  return (
    <section className="auth-welcome-stage" aria-labelledby="welcome-title">
      <div className="auth-welcome-card">
        <div className="auth-welcome-image">
          <Image
            src="/images/runner-welcome-v2.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
          />
          <AuthBrand editorial />
        </div>
        <div className="auth-welcome-copy">
          <div
            className="auth-welcome-message"
            aria-live="polite"
            aria-atomic="true"
          >
            <h1 id="welcome-title">
              {slide.title}
              <br />
              <span>{slide.accent}</span>
            </h1>
            <p>{slide.description}</p>
          </div>
          <div className="area-grid auth-welcome-features">
            {areas.map(({ title, icon: Icon }) => (
              <article key={title}>
                <span>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h2>{title}</h2>
              </article>
            ))}
          </div>
          <div
            className="auth-welcome-pagination"
            role="group"
            aria-label="Apresentação do Diazen"
          >
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Apresentação ${index + 1}: ${item.title} ${item.accent}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="auth-welcome-actions">
            <Link href="/cadastro" className="button-primary">
              Criar conta gratuita
            </Link>
            <Link href="/entrar" className="button-secondary">
              Entrar na minha conta
            </Link>
          </div>
          <a className="auth-first-steps" href="#primeiros-passos">
            Conhecer os primeiros passos
          </a>
        </div>
      </div>
    </section>
  );
}
