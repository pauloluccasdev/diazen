import "./profile.css";
import Link from "next/link";
import {
  UserRound,
  Target,
  SlidersHorizontal,
  ShieldCheck,
  Download,
  Trash2,
  Pencil,
  Camera,
  ChevronRight,
  KeyRound,
  FileText,
  Droplet,
  Dumbbell,
  Scale,
  Flame,
  Beef,
  FolderOpen,
} from "lucide-react";
import { ProfileAvatar } from "./profile-avatar";
import { AvatarEditor } from "./avatar-editor";
import {
  ProfileNameForm,
  ProfileAppearance,
  ProfileRetry,
} from "./profile-fields";
import { AccountDeletion } from "./account-deletion";
import { DisplaySettings } from "@/components/daily/display-settings";
import { LogoutButton } from "@/components/logout-button";
import { ReturnLink } from "@/components/return-link";
import type { DisplayPreferences } from "@/lib/daily-followup";
import type { ProfileReferences } from "@/lib/profile-data";
import { projectWeightReference } from "@/lib/project-metrics";
import { formatDate, number } from "@/lib/domain";

export const profileSections = [
  "perfil",
  "metas",
  "preferencias",
  "seguranca",
  "exportar",
  "conta",
] as const;
export type ProfileSection = (typeof profileSections)[number] | "overview";
const destinations = [
  {
    id: "perfil",
    label: "Dados pessoais",
    description: "Nome e foto de perfil",
    icon: UserRound,
  },
  {
    id: "metas",
    label: "Objetivos e metas",
    description: "Referências do projeto ativo",
    icon: Target,
  },
  {
    id: "preferencias",
    label: "Preferências",
    description: "Visualização e tema do desktop",
    icon: SlidersHorizontal,
  },
  {
    id: "seguranca",
    label: "Privacidade e segurança",
    description: "Senha e controle dos dados",
    icon: ShieldCheck,
  },
  {
    id: "exportar",
    label: "Exportar dados",
    description: "Baixar seus registros",
    icon: Download,
  },
  {
    id: "conta",
    label: "Gerenciar conta",
    description: "Solicitar exclusão da conta",
    icon: Trash2,
  },
] as const;

function Goals({
  references,
  unavailable,
}: {
  references: ProfileReferences;
  unavailable: boolean;
}) {
  if (unavailable)
    return (
      <section className="content-card profile-panel" id="metas">
        <h2>Objetivos e metas</h2>
        <p role="status">
          Não foi possível carregar as referências do projeto.
        </p>
        <ProfileRetry label="Tentar novamente as referências" />
      </section>
    );
  if (!references)
    return (
      <section className="content-card profile-panel" id="metas">
        <h2>Objetivos e metas</h2>
        <p>
          Ative um projeto para configurar as referências do seu acompanhamento.
        </p>
        <Link
          prefetch={false}
          className="button-secondary"
          href="/painel/projetos"
        >
          <FolderOpen size={18} aria-hidden="true" />
          Gerenciar projetos
        </Link>
      </section>
    );
  const { project, weight, water, plan } = references,
    reference = projectWeightReference(project);
  const nutrients = plan
    ? [
        {
          label: "Calorias do plano",
          unit: "kcal",
          icon: Flame,
          total: plan.totals.kcal,
        },
        {
          label: "Proteína do plano",
          unit: "g",
          icon: Beef,
          total: plan.totals.protein,
        },
      ]
    : [];
  return (
    <section
      className="content-card profile-panel"
      id="metas"
      aria-labelledby="profile-goals-title"
    >
      <h2 id="profile-goals-title">Objetivos e metas</h2>
      <p>
        Referências configuradas no seu projeto e no plano alimentar vigente.
      </p>
      <div className="profile-active-project">
        <span>
          <Target size={26} aria-hidden="true" />
        </span>
        <div>
          <small>Projeto ativo</small>
          <strong>{project.name}</strong>
        </div>
        <Link
          prefetch={false}
          className="button-secondary"
          href="/painel/projetos"
        >
          <Pencil size={16} aria-hidden="true" />
          Gerenciar metas
        </Link>
      </div>
      <dl className="profile-goal-grid">
        {weight && (
          <div>
            <dt>
              <Scale size={20} aria-hidden="true" />
              Peso registrado
            </dt>
            <dd>
              {number(weight.kg)} kg
              <small>em {formatDate(weight.logged_on)}</small>
            </dd>
          </div>
        )}
        {reference && (
          <div>
            <dt>
              <Target size={20} aria-hidden="true" />
              {reference.max === null ? "Meta de peso" : "Faixa de peso"}
            </dt>
            <dd>
              {number(reference.min)}
              {reference.max !== null ? `–${number(reference.max)}` : ""} kg
            </dd>
          </div>
        )}
        {water && (
          <div>
            <dt>
              <Droplet size={20} aria-hidden="true" />
              Água por dia
            </dt>
            <dd>
              {number(water.target_ml, 0)} ml
              <small>desde {formatDate(water.effective_from)}</small>
            </dd>
          </div>
        )}
        {project.sessions_goal !== null && (
          <div>
            <dt>
              <Dumbbell size={20} aria-hidden="true" />
              Treinos na semana
            </dt>
            <dd>{project.sessions_goal} sessões</dd>
          </div>
        )}
        {nutrients.map(({ label, unit, icon: Icon, total }) => (
          <div key={label}>
            <dt>
              <Icon size={20} aria-hidden="true" />
              {label}
            </dt>
            <dd>
              {total.value === null
                ? "Não informado"
                : `${number(total.value)} ${unit}`}
              {total.missing > 0 && (
                <small>
                  Subtotal parcial · {total.missing}{" "}
                  {total.missing === 1 ? "item sem valor" : "itens sem valor"}
                </small>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {plan ? (
        <p className="profile-plan-reference">
          <Link prefetch={false} href={`/painel/plano?projeto=${project.id}`}>
            {plan.title}
          </Link>{" "}
          · vigente desde {formatDate(plan.effective_from)}. Valores informados
          no plano.
        </p>
      ) : (
        <Link
          prefetch={false}
          className="profile-plan-reference"
          href={`/painel/plano?projeto=${project.id}`}
        >
          Consultar ou adicionar plano alimentar
        </Link>
      )}
    </section>
  );
}

export function ProfileDirectory({
  name,
  email,
  avatarId,
  section,
  preferences,
  references,
  avatarOpen,
  referencesUnavailable,
  preferencesUnavailable,
}: {
  name: string | null;
  email: string | null;
  avatarId: string | null;
  section: ProfileSection;
  preferences: DisplayPreferences | null;
  references: ProfileReferences;
  avatarOpen: boolean;
  referencesUnavailable: boolean;
  preferencesUnavailable: boolean;
}) {
  const visible = (id: (typeof profileSections)[number]) =>
    section === "overview" || section === id;
  return (
    <div className={`profile-directory profile-view-${section}`}>
      <header className="profile-heading">
        {section !== "overview" && (
          <ReturnLink href="/painel/perfil">Voltar às configurações</ReturnLink>
        )}
        <div>
          <h1>Perfil e configurações</h1>
          <p>Gerencie sua conta e preferências.</p>
        </div>
      </header>
      <div className="profile-layout">
        <aside className="content-card profile-sidebar">
          <div className="profile-identity">
            <div className="profile-identity-image">
              <ProfileAvatar name={name} avatarId={avatarId} size={112} />
              <Link
                prefetch={false}
                href="/painel/perfil?secao=perfil&foto=1#profile-avatar"
                className="profile-edit-photo"
                aria-label="Editar foto de perfil"
              >
                <Camera size={18} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h2>{name ?? "Minha conta"}</h2>
              <p>{email ?? "E-mail de acesso indisponível"}</p>
            </div>
            <Link
              prefetch={false}
              href="/painel/perfil?secao=perfil"
              className="profile-edit-name"
              aria-label="Editar perfil"
            >
              <Pencil size={18} aria-hidden="true" />
            </Link>
          </div>
          <nav
            className="profile-navigation"
            aria-label="Configurações da conta"
          >
            {destinations.map(({ id, label, description, icon: Icon }) => (
              <Link
                prefetch={false}
                key={id}
                href={`/painel/perfil?secao=${id}`}
                aria-current={
                  (section === "overview" ? "perfil" : section) === id
                    ? "page"
                    : undefined
                }
              >
                <span className="profile-navigation-icon">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <div className="profile-signout">
            <LogoutButton icon />
          </div>
        </aside>
        <div className="profile-panels">
          {visible("perfil") && (
            <section
              className="content-card profile-panel"
              id="perfil"
              aria-labelledby="profile-data-title"
            >
              <h2 id="profile-data-title">Dados do perfil</h2>
              <p>Mantenha seu nome de exibição e sua foto atualizados.</p>
              <ProfileNameForm name={name} email={email} />
              <AvatarEditor avatarId={avatarId} initiallyOpen={avatarOpen} />
            </section>
          )}
          {visible("metas") && (
            <Goals
              references={references}
              unavailable={referencesUnavailable}
            />
          )}
          {visible("preferencias") && preferencesUnavailable && (
            <section className="content-card profile-panel">
              <h2>Preferências</h2>
              <p role="status">Não foi possível carregar suas preferências.</p>
              <ProfileRetry label="Tentar novamente preferências" />
            </section>
          )}
          {visible("preferencias") && preferences && (
            <section className="content-card profile-panel" id="preferencias">
              <h2>Preferências</h2>
              <p>Personalize a experiência do Diazen.</p>
              <ProfileAppearance />
              <DisplaySettings initial={preferences} />
            </section>
          )}
          {visible("seguranca") && (
            <section className="content-card profile-panel" id="seguranca">
              <h2>Privacidade e segurança</h2>
              <p>Gerencie sua senha e consulte como seus dados são tratados.</p>
              <nav
                className="profile-security-links"
                aria-label="Privacidade e segurança"
              >
                <Link prefetch={false} href="/nova-senha">
                  <KeyRound size={20} aria-hidden="true" />
                  Alterar senha
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
                <Link prefetch={false} href="/privacidade">
                  <ShieldCheck size={20} aria-hidden="true" />
                  Dados e privacidade
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
                <Link prefetch={false} href="/termos">
                  <FileText size={20} aria-hidden="true" />
                  Termos de uso
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              </nav>
            </section>
          )}
          {visible("exportar") && (
            <section className="content-card profile-panel" id="exportar">
              <h2>Exportar dados</h2>
              <p>
                Baixe seus projetos, referências, perfil e registros em JSON. Os
                arquivos privados são salvos pelos acessos autenticados do
                aplicativo.
              </p>
              <div className="profile-export-actions">
                <a className="button-primary" href="/api/exportar" download>
                  <Download size={18} aria-hidden="true" />
                  Baixar meus dados
                </a>
                {avatarId && (
                  <a
                    className="button-secondary"
                    href={`/api/perfil/avatar?versao=${avatarId}&baixar=1`}
                    download
                  >
                    Baixar foto de perfil
                  </a>
                )}
                <Link
                  prefetch={false}
                  className="button-secondary"
                  href="/painel/fotos"
                >
                  Fotos de evolução
                </Link>
              </div>
            </section>
          )}
          {visible("conta") && <AccountDeletion />}
        </div>
      </div>
    </div>
  );
}
