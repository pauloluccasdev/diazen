import { categories, units } from "@/lib/records";
import { today } from "@/lib/domain";
export function FoodUseFields({
  date = today(),
  amount = 100,
  unit,
}: {
  date?: string;
  amount?: number;
  unit: keyof typeof units;
}) {
  return (
    <>
      <input type="hidden" name="request_id" value={crypto.randomUUID()} />
      <label>
        Data do consumo
        <input
          type="date"
          name="logged_on"
          required
          max={today()}
          defaultValue={date}
        />
      </label>
      <label>
        Refeição de destino
        <select name="category">
          {Object.entries(categories).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantidade a consumir ({units[unit]})
        <input
          name="amount"
          type="number"
          required
          min="0.001"
          max={100000}
          step="0.001"
          defaultValue={amount}
        />
      </label>
    </>
  );
}
