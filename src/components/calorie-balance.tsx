import { ProgressRing } from "./progress-ring";
import { number } from "@/lib/domain";
export function CalorieBalance({
  consumed,
  planned,
  partial,
}: {
  consumed: number | null;
  planned: number | null;
  partial: boolean;
}) {
  const difference =
    consumed !== null && planned !== null && !partial
      ? planned - consumed
      : null;
  return (
    <div
      className="calorie-balance"
      aria-label="Comparação de calorias com o plano"
    >
      <div className="calorie-balance-figure">
        <strong>
          {consumed === null ? "Não informado" : `${number(consumed)} kcal`}
        </strong>
        <span>Registradas</span>
      </div>
      <ProgressRing
        value={partial ? null : consumed}
        max={partial ? null : planned}
        label={
          partial
            ? "Comparação parcial de calorias"
            : "Calorias registradas em relação ao plano"
        }
      >
        <strong>
          {difference === null ? "—" : number(Math.abs(difference))}
        </strong>
        <span>
          {difference === null
            ? "Sem comparação"
            : difference < 0
              ? "kcal acima do plano"
              : "kcal até o plano"}
        </span>
      </ProgressRing>
      <div className="calorie-balance-figure">
        <strong>
          {planned === null ? "Não informado" : `${number(planned)} kcal`}
        </strong>
        <span>Planejadas</span>
      </div>
      <p className="field-hint">
        {partial
          ? "Valores parciais. Complete os dados para comparar."
          : "Comparação com o plano alimentar; não representa calorias gastas nem confirma aderência."}
      </p>
    </div>
  );
}
