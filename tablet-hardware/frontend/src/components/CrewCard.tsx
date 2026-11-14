import type { CrewFrame, HistoryPoint, Thresholds } from "../types";
import { LEVEL_LABEL, levelClass, mmss } from "../format";
import { TrendChart } from "./TrendChart";

interface Props {
  c: CrewFrame;
  points: HistoryPoint[];
  th: Thresholds;
  linked: boolean;
  onRespond: () => void;
  source?: "max" | "nasa";
}

const REPLAY_LABEL: Record<string, string> = {
  hypoxia: "Analog Harespod SpO₂ climb",
  startle: "NASA crew-state startle session",
  nominal: "Calm baseline recording",
};

function Meter({ label, held, need }: { label: string; held: number; need: number }) {
  const pct = Math.min(1, held / need);
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span className="num">{Math.min(held, 999)} / {need} s</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${pct >= 1 ? "full" : ""}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function Vital({ label, value, unit, sub, warn }: { label: string; value: string; unit?: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`vital ${warn ? "vital-warn" : ""}`}>
      <div className="vital-label">{label}</div>
      <div className="vital-value num">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {sub && <div className="vital-sub">{sub}</div>}
    </div>
  );
}

const NO_SENSOR = "No sensor";

function SensorTag({ s, signal }: { s?: CrewFrame["sensor"]; signal: boolean }) {
  if (!s?.connected) return <span className="sensor-tag off">Sensor offline</span>;
  return <span className={`sensor-tag ${signal ? "on" : "weak"}`}>{signal ? "Sensor live" : "Sensor: no finger / weak signal"}</span>;
}

export function CrewCard({ c, points, th, linked, onRespond, source = "max" }: Props) {
  const nasa = source === "nasa";
  const alarming = c.level === "CAUTION" || c.level === "WARNING";
  const b = c.baseline;
  const rt = c.reaction;
  return (
    <section className={`card crew ${levelClass(c.level)} ${linked ? "" : "los"}`}>
      <header className="crew-head">
        <div>
          <div className="crew-id">{c.id}</div>
          <div className="crew-meta">{c.name} · {c.role} · {nasa ? <span className="sensor-tag replay">Replay: {REPLAY_LABEL[c.replay ?? ""] ?? c.replay}</span> : <SensorTag s={c.sensor} signal={c.signal} />}</div>
        </div>
        <div className={`chip ${levelClass(c.level)}`}>{linked ? LEVEL_LABEL[c.level] : "No signal"}</div>
      </header>

      <div className="hero">
        <div>
          <div className="hero-label">SpO₂</div>
          <div className={`hero-value num ${c.signal ? "" : "no-signal"}`}>
            {c.signal ? c.spo2_smooth.toFixed(0) : "--"}
            <span className="unit">%</span>
          </div>
          <div className="hero-sub num">{b ? `Baseline ${b.spo2_mean.toFixed(1)} ± ${b.spo2_sd.toFixed(1)}` : "Baseline pending"}</div>
        </div>
        <div className="hero-dev">
          <div className="hero-label">From baseline</div>
          <div className={`dev-value num ${c.z <= th.warning_z ? "t-warning" : c.z <= th.caution_z ? "t-caution" : ""}`}>
            {b ? `${c.z >= 0 ? "+" : "−"}${Math.abs(c.z).toFixed(1)} σ` : "—"}
          </div>
          <div className="hero-sub num">
            {b ? `${c.slope_per_min >= 0 ? "+" : "−"}${Math.abs(c.slope_per_min).toFixed(1)} %/min` : ""}
          </div>
        </div>
      </div>

      <TrendChart points={points} baseline={b} th={th} />

      {c.phase === "PRE-EVA" ? (
        <div className="calib">
          <div className="meter-head">
            <span>Recording personal pre-EVA baseline</span>
            <span className="num">{mmss(c.calibration_left_s)}</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill calib-fill" style={{ width: `${(1 - c.calibration_left_s / th.baseline_s) * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="meters">
          <Meter label={`Below ${th.caution_z} σ → caution`} held={c.below_caution_s} need={th.caution_hold_s} />
          <Meter label={`Below ${th.warning_z} σ → warning`} held={c.below_warning_s} need={th.warning_hold_s} />
        </div>
      )}

      <div className="hr-block">
        <div className="chart-head">
          <span>Heart rate · last 5 min</span>
          <span className="num">
            <span className="hr-now">{c.hr != null ? `${c.hr} bpm` : "No signal"}</span>
            {b ? `  ·  baseline ${b.hr_mean.toFixed(0)} ± ${(2 * b.hr_sd).toFixed(0)}` : ""}
          </span>
        </div>
        <TrendChart points={points} baseline={b} th={th} height={92} metric="hr" />
      </div>

      <div className="vitals">
        <Vital label="Heart rate" value={c.hr != null ? String(c.hr) : "—"} unit={c.hr != null ? "bpm" : undefined}
          sub={c.hr == null ? "No signal" : b ? `${c.hr_delta >= 0 ? "+" : "−"}${Math.abs(c.hr_delta)} vs baseline` : nasa ? "Recorded" : "MAX30102"} warn={c.startle} />
        <Vital label="HRV (RMSSD)" value={c.hrv != null ? String(c.hrv) : "—"} unit={c.hrv != null ? "ms" : undefined}
          sub={c.hrv == null ? NO_SENSOR : undefined} />
        <Vital label="Breathing" value={c.resp != null ? c.resp.toFixed(0) : "—"} unit={c.resp != null ? "/min" : undefined}
          sub={c.resp == null ? NO_SENSOR : undefined} />
        <Vital label="Suit pressure" value={c.suit_psia != null ? c.suit_psia.toFixed(2) : "—"} unit={c.suit_psia != null ? "psia" : undefined}
          sub={c.suit_psia == null ? NO_SENSOR : c.suit_psia < 4.0 ? "Low (nominal 4.3)" : "Nominal 4.3"}
          warn={c.suit_psia != null && c.suit_psia < 4.0} />
        <Vital label="O₂ equiv. altitude" value={c.eq_alt_m == null ? "—" : c.eq_alt_m > 0 ? c.eq_alt_m.toLocaleString() : "Sea lvl"}
          unit={c.eq_alt_m != null && c.eq_alt_m > 0 ? "m" : undefined} sub={c.eq_alt_m == null ? NO_SENSOR : "What the lungs feel"}
          warn={c.eq_alt_m != null && c.eq_alt_m > 2500} />
        <Vital label="Reaction check" value={rt ? (rt.missed ? "Missed" : String(rt.ms)) : "—"}
          unit={rt && !rt.missed ? "ms" : undefined} sub={rt ? "From helmet HUD" : NO_SENSOR}
          warn={!!rt && (rt.missed || (rt.ms ?? 0) > 450)} />
      </div>

      <footer className="crew-foot">
        <p className="reason">{c.reasons[0]}</p>
        {nasa ? (
          <span className="view-only">View only · alarms come from MAX</span>
        ) : (
          <button className={`btn ${alarming ? "btn-alert" : "btn-quiet"}`} onClick={onRespond}>
            Hypoxia response
          </button>
        )}
      </footer>
    </section>
  );
}
