import Link from "next/link";
import { Droplets,Utensils,Dumbbell,ChartNoAxesCombined,Camera,Ruler } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { OfflineSnapshot } from "@/components/offline-snapshot";
import { projectContext } from "@/lib/data";
import type {Summary} from "@/lib/records";
import { statusLabel,formatDate,today,isDate,number } from "@/lib/domain";
export const metadata={title:'Seu painel'};
export const dynamic='force-dynamic';
export default async function Panel({searchParams}:{searchParams:Promise<{projeto?:string;data?:string}>}){
  const params=await searchParams,{selected,projects,active,client}=await projectContext(params.projeto);
  const date=params.data&&isDate(params.data)?params.data:selected?.ends_on&&selected.ends_on<today()?selected.ends_on:today();
  let summary:Summary|null=null;
  if(selected){const {data,error}=await client.rpc('project_summary',{p_project:selected.id,p_date:date});if(error)throw new Error('Falha ao carregar indicadores');summary=data as Summary;}
  const cards=summary?[
    {label:'Alimentação',module:'alimentacao',icon:Utensils,value:summary.kcal===null?(Number(summary.food_count)>0?'Calorias não informadas':'Sem refeições registradas'):`${number(summary.kcal)} kcal`,detail:summary.missing_kcal>0&&summary.kcal!==null?'Subtotal parcial, faltam valores':'Valores informados no diário'},
    {label:'Hidratação',module:'agua',icon:Droplets,value:summary.water_ml===null?'Sem registros':`${number(summary.water_ml,0)} ml`,detail:summary.water_goal===null?'Meta não configurada':`Meta vigente: ${number(summary.water_goal,0)} ml`},
    {label:'Atividades',module:'atividades',icon:Dumbbell,value:summary.sessions===null?'Sem sessões registradas':`${summary.sessions} sessões na semana`,detail:selected?.sessions_goal===null?'Meta não configurada':`Meta geral: ${selected?.sessions_goal} sessões/semana`},
    {label:'Peso',module:'peso',icon:ChartNoAxesCombined,value:summary.weight===null?'Sem peso registrado':`${number(summary.weight,2)} kg`,detail:summary.weight_date?`Registrado em ${formatDate(summary.weight_date)}`:'Seu ritmo, sua evolução'},
  ]:[];
  return <><section className="welcome"><p className="eyebrow">SEU ESPAÇO</p><h1>Bem-vindo à sua jornada.</h1><p className="intro">Um registro de cada vez. Seu progresso começa no seu dia.</p></section>
    {selected&&summary?<>
      <form className="filter-form"><label>Projeto visualizado<select name="projeto" defaultValue={selected.id}>{!projects.some(p=>p.id===selected.id)&&<option value={selected.id}>{selected.name}</option>}{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {statusLabel[p.status]}</option>)}</select></label><label>Data da consulta<input type="date" name="data" defaultValue={date} max={today()} /></label><button className="button-primary">Consultar</button></form>
      <section className="project-card dashboard-hero"><div className="project-content"><span className="status">{statusLabel[selected.status]}</span><h2>{selected.name}</h2><p>Desde {formatDate(selected.starts_on)}{selected.ends_on&&` até ${formatDate(selected.ends_on)}`}</p><p className="intro">{selected.weight_mode==='target'?`Peso alvo: ${number(selected.weight_min!,2)} kg`:selected.weight_mode==='range'?`Faixa de peso: ${number(selected.weight_min!,2)} a ${number(selected.weight_max!,2)} kg`:selected.weight_mode==='track'?'Peso em acompanhamento, sem alvo numérico.':'Meta de peso não configurada.'}</p><Link className="back-link" href="/painel/projetos">Gerenciar projetos →</Link></div></section>
      {selected.status!=='ACTIVE'&&<p className="readonly-note">{selected.status==='DRAFT'?'Este é um rascunho e ainda não recebe registros.':'Histórico somente leitura.'} {active?`Novos registros são destinados ao projeto ativo “${active.name}”.`:'Ative um projeto para começar a registrar.'}</p>}
      <section className="areas-section" aria-labelledby="daily-title"><div className="section-heading"><h2 id="daily-title">Seu dia, por inteiro</h2><span>{formatDate(date)}</span></div><div className="area-grid">{cards.map(({label,module,icon:Icon,value,detail})=><Link className="area-card" key={module} href={`/painel/${module}?projeto=${selected.id}&data=${date}`}><span className="icon-box"><Icon size={22} aria-hidden="true" /></span><h3>{label} →</h3><p className="metric-value">{value}</p><p>{detail}</p></Link>)}</div></section>
      <nav className="panel-nav" aria-label="Evolução corporal"><Link href={`/painel/medidas?projeto=${selected.id}`}><Ruler size={18} aria-hidden="true" />Medidas corporais</Link><Link href={`/painel/fotos?projeto=${selected.id}`}><Camera size={18} aria-hidden="true" />Fotografias privadas</Link></nav>
      <OfflineSnapshot project={selected.name} date={formatDate(date)} items={cards.map(card=>({label:card.label,value:card.value}))} />
    </>:<div className="content-card"><h2>Vamos preparar seu primeiro projeto?</h2><p className="intro">Escolha pelo menos uma meta de água, peso ou sessões para começar.</p><Link className="button-primary" href="/painel/projetos">Configurar meu primeiro projeto</Link></div>}
    <LogoutButton />
  </>;
}
