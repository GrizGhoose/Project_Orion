import { useState } from "react";
import { DEMO, post } from "../api";
import { demoEngine } from "../demo/engine";
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
  const [speed, setSpeed] = useState(() => (DEMO ? demoEngine().speed : 1));
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="section-title">Sensors</h2>
          <button className="btn btn-quiet sm" onClick={onClose}>Done</button>
        </div>
        <p className="fine">
          {DEMO
            ? "Hosted demo: no ESP32 boards. A simulated time series stands in for each crewmember's board: SpO₂ and HR (MAX30102), HRV, breathing, suit pressure and the HUD reaction check."
            : "One ESP32 + MAX30102 per crewmember, read once a second."}
        </p>

        <div className="sheet-label">Connection</div>
        <dl className="sources">
          {crew.map((c) => (
            <div key={c.id}>
              <dt>{c.id}</dt>
              <dd>
                {c.sensor?.simulated ? "Simulated feed" : c.sensor?.connected ? (c.signal ? "Live" : "Connected, no finger / weak signal") : "Offline"}
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
          {!DEMO && <button onClick={() => void post("/api/nasa/restart", {})}>Restart NASA replay</button>}
        </div>
        <p className="fine">
          Clears the mission clock and records a new personal baseline ({cfg.thresholds.baseline_s} s of steady readings) for everyone.
          Do this once the sensors are on.{!DEMO && " The NASA tab's recording restarts separately and loops on its own."}
        </p>

        {DEMO && (
          <>
            <div className="sheet-label">Demo speed</div>
            <div className="seg">
              {[1, 5, 10, 20].map((x) => (
                <button key={x} className={speed === x ? "on" : ""} onClick={() => { demoEngine().setSpeed(x); setSpeed(x); }}>{x}×</button>
              ))}
            </div>
            <p className="fine">Mission seconds per real second. At 1× the baseline takes 10 s and EV1's hypoxia alarm fires at 20 s.</p>
          </>
        )}

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
