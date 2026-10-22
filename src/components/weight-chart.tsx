import type { Entry } from "@/lib/records";
import { number } from "@/lib/domain";
export function WeightChart({ rows }: { rows: Entry[] }) {
  if(rows.length<2) return <p className="muted">Registre peso em pelo menos duas datas para visualizar o gráfico.</p>;
  const values=[...rows].reverse();
  const min=Math.min(...values.map(r=>Number(r.kg)))-1,max=Math.max(...values.map(r=>Number(r.kg)))+1;
  const points=values.map((r,i)=>`${20+i*560/(values.length-1)},${150-(Number(r.kg)-min)*130/(max-min)}`).join(' ');
  return <figure className="weight-chart"><svg viewBox="0 0 600 180" role="img" aria-label={`Peso nas últimas ${values.length} medições: de ${number(values[0].kg!)} a ${number(values.at(-1)!.kg!)} kg. Os valores estão no histórico abaixo.`}><line x1="20" y1="150" x2="580" y2="150" stroke="#414751" /><polyline points={points} fill="none" stroke="#FF9F24" strokeWidth="3" strokeLinejoin="round" />{points.split(' ').map((p,i)=>{const [cx,cy]=p.split(',');return <circle key={i} cx={cx} cy={cy} r="4" fill="#FF9F24" />;})}</svg><figcaption className="muted">Últimas {values.length} medições · valores em kg</figcaption></figure>;
}
