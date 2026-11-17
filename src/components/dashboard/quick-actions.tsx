import Link from "next/link";
import { Plus, Droplet, Dumbbell, ChartNoAxesCombined } from "lucide-react";
export function QuickActions({
  project,
  date,
  editable,
}: {
  project: string;
  date: string;
  editable: boolean;
}) {
  return (
    <section className="v2-quick-actions" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">
        {editable ? "Ações rápidas" : "Explorar registros"}
      </h2>
      <nav aria-label="Ações rápidas">
        {[
          {
            path: "alimentacao",
            label: editable ? "Registrar refeição" : "Alimentação",
            icon: Plus,
          },
          { path: "agua", label: "Água", icon: Droplet },
          { path: "atividades", label: "Treino", icon: Dumbbell },
          { path: "peso", label: "Evolução", icon: ChartNoAxesCombined },
        ].map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            href={`/painel/${path}?projeto=${project}&data=${date}${editable ? "&registrar=1#novo-registro" : ""}`}
          >
            <Icon size={26} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
