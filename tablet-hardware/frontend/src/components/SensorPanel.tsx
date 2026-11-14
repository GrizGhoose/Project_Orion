import { post } from "../api";
import type { AppConfig, CrewFrame } from "../types";

interface Props {
  cfg: AppConfig;
  crew: CrewFrame[];
  muted: boolean;
  onMute: (m: boolean) => void;
  onClose: () => void;
}

/** Sensor status and setup: which ESP32 boards are connected, and restarting the personal baseline. */
export function SensorPanel({ cfg, crew, muted, onMute, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="section-title">Sensors</h2>
          <button className="btn btn-quiet sm" onClick={onClose}>Done</button>
        </div>
        <p className="fine">One ESP32 + MAX30102 per crewmember, read once a second.</p>

        <div className="sheet-label">Connection</div>
        <dl className="sources">
          {crew.map((c) => (
            <div key={c.id}>
              <dt>{c.id}</dt>
              <dd>
                {c.sensor?.connected ? (c.signal ? "Live" : "Connected, no finger / weak signal") : "Offline"}
                {c.sensor?.age_s != null && ` · last reading ${c.sensor.age_s} s ago`}
                <br />
                <span className="fine">{c.sensor?.url || "No board configured; can POST to /api/ingest/" + c.id}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="sheet-label">Baseline</div>
        <div className="seg">
          <button onClick={() => void post("/api/baseline/restart", {})}>Restart baseline</button>
          <button onClick={() => void post("/api/nasa/restart", {})}>Restart NASA replay</button>
        </div>
        <p className="fine">
          Clears the mission clock and records a new personal baseline ({cfg.thresholds.baseline_s} s of steady readings) for everyone.
          Do this once the sensors are on. The NASA tab's recording restarts separately and loops on its own.
        </p>

        <div className="sheet-label">Sound</div>
        <div className="seg">
          <button className={!muted ? "on" : ""} onClick={() => onMute(false)}>On</button>
          <button className={muted ? "on" : ""} onClick={() => onMute(true)}>Muted</button>
        </div>

        <div className="sheet-label">Where each number comes from</div>
        <dl className="sources">
          {Object.entries(cfg.sources).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}
