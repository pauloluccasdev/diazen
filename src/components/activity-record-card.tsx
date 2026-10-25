import type { ReactNode } from "react";
import {
  Activity,
  Bike,
  ChevronDown,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Route,
  Waves,
} from "lucide-react";
import { activityModality, type Entry } from "@/lib/records";
import { formatDate, number } from "@/lib/domain";
const icons = {
  strength: Dumbbell,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  other: Activity,
};
export function ActivityRecordCard({
  row,
  children,
}: {
  row: Entry;
  children: ReactNode;
}) {
  const Icon = icons[row.modality ?? "other"];
  const distanceMain =
    ["running", "cycling", "swimming"].includes(row.modality ?? "") &&
    row.distance_km != null;
  return (
    <details className="activity-record-details">
      <summary>
        <span className="activity-record-topline">
          <span className="activity-record-type">
            <Icon size={18} aria-hidden="true" />
            {activityModality(row)}
          </span>
          <span>{formatDate(row.logged_on)}</span>
        </span>
        <strong className="activity-record-title" role="heading" aria-level={3}>
          {row.name || activityModality(row)}
        </strong>
        <span className="activity-record-main">
          <strong>
            {distanceMain
              ? number(row.distance_km!, 2)
              : number(row.duration_min!, 1)}
          </strong>
          <span>{distanceMain ? "km" : "min"}</span>
        </span>
        <span className="activity-record-metrics">
          <span>
            <Clock3 size={17} aria-hidden="true" />
            <strong>{number(row.duration_min!, 1)} min</strong>
            <small>Duração</small>
          </span>
          <span>
            <Route size={17} aria-hidden="true" />
            <strong>
              {row.distance_km == null
                ? "—"
                : `${number(row.distance_km, 2)} km`}
            </strong>
            <small>
              {row.distance_km == null ? "Não informada" : "Distância"}
            </small>
          </span>
          <span>
            <Flame size={17} aria-hidden="true" />
            <strong>
              {row.kcal == null ? "—" : `${number(row.kcal)} kcal`}
            </strong>
            <small>{row.kcal == null ? "Não informadas" : "Calorias"}</small>
          </span>
        </span>
        <span className="activity-record-footer">
          <span>
            {row.external_provider === "garmin"
              ? "Garmin Connect"
              : "Registro manual"}
          </span>
          <span>
            Ver detalhes <ChevronDown size={17} aria-hidden="true" />
          </span>
        </span>
      </summary>
      <div className="activity-record-body">{children}</div>
    </details>
  );
}
