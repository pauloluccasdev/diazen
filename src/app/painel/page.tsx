import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { projectContext } from "@/lib/data";
import { modules } from "@/lib/records";
import { statusLabel, formatDate } from "@/lib/domain";
export const metadata = { title: "Seu painel" };
export const dynamic = "force-dynamic";
export default async function Panel({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const params = await searchParams;
  const { selected, projects, active } = await projectContext(params.projeto);
  return <><section className="welcome"><p className="eyebrow">SEU ESPAÇO</p><h1>Bem-vindo à sua jornada.</h1><p className="intro">Um registro de cada vez. Seu progresso começa no seu dia.</p></section>
    {selected ? <>
      <form className="filter-form"><label>Projeto visualizado<select name="projeto" defaultValue={selected.id}>{!projects.some(p=>p.id===selected.id) && <option value={selected.id}>{selected.name}</option>}{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {statusLabel[p.status]}</option>)}</select></label><button className="button-primary">Consultar</button></form>
      <div className="content-card"><span className="status">{statusLabel[selected.status]}</span><h2>{selected.name}</h2><p className="intro">Desde {formatDate(selected.starts_on)}{selected.ends_on && ` até ${formatDate(selected.ends_on)}`}</p><Link className="back-link" href="/painel/projetos">Gerenciar projetos →</Link></div>
      {selected.status !== "ACTIVE" && <p className="readonly-note">{selected.status === "DRAFT" ? "Este é um rascunho e ainda não recebe registros." : "Histórico somente leitura."} {active ? `Novos registros são destinados ao projeto ativo “${active.name}”.` : "Ative um projeto para começar a registrar."}</p>}
    </> : <div className="content-card"><h2>Vamos preparar seu primeiro projeto?</h2><p className="intro">Escolha pelo menos uma meta de água, peso ou sessões para começar.</p><Link className="button-primary" href="/painel/projetos">Configurar meu primeiro projeto</Link></div>}
    {selected && <section className="area-grid" aria-label="Áreas do diário">{Object.entries(modules).map(([key,module])=><Link key={key} className="area-card" href={`/painel/${key}?projeto=${selected.id}`}><h3>{module.title} →</h3><p>{module.description}</p></Link>)}<Link className="area-card" href={`/painel/fotos?projeto=${selected.id}`}><h3>Fotografias →</h3><p>Sua evolução em imagens privadas.</p></Link></section>}
    <LogoutButton />
  </>;
}
