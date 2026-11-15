import type { CrewFrame } from "../types";
import { RANK, isAlarm } from "../types";
import { levelClass } from "../format";

interface Props {
  crew: CrewFrame[];
  onAck: (id: string) => void;
  onRespond: (id: string) => void;
}

/** Caution & warning banner, highest first. Stays until the alert clears. */
export function AlertBanner({ crew, onAck, onRespond }: Props) {
  const alerts = crew
    .filter((c) => isAlarm(c.level))
    .sort((a, b) => RANK[b.level] - RANK[a.level]);
  if (!alerts.length) return null;
  return (
    <div className="banners">
      {alerts.map((c) => (
        <div key={c.id} className={`banner ${levelClass(c.level)} ${c.acked ? "acked" : "flash"}`} role="alert">
          <div className="banner-tag">{c.level}</div>
          <div className="banner-body">
            <div className="banner-title">
              {c.id} {RANK[c.level] >= RANK.WARNING ? "HYPOXIA" : "SpO₂ LOW"} · <span className="num">{c.spo2_smooth.toFixed(0)} %</span>
            </div>
            <div className="banner-reason">{c.reasons[0]}</div>
          </div>
          <button className="btn btn-ghost" disabled={c.acked} onClick={() => onAck(c.id)}>
            {c.acked ? "Acknowledged" : "Acknowledge"}
          </button>
          <button className="btn btn-solid" onClick={() => onRespond(c.id)}>Start response</button>
        </div>
      ))}
    </div>
  );
}
