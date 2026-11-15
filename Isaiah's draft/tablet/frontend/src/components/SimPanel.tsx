import { post } from "../api";
import type { AppConfig, Frame } from "../types";

interface Props {
  cfg: AppConfig;
  frame: Frame | null;
  muted: boolean;
  onMute: (m: boolean) => void;
  onClose: () => void;
}

/** Demo operator controls. Not part of the crew UI. */
export function SimPanel({ cfg, frame, muted, onMute, onClose }: Props) {
  const send = (body: object) => post("/api/sim", body);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="section-title">Demo controls</h2>
          <button className="btn btn-quiet sm" onClick={onClose}>Done</button>
        </div>
        <p className="fine">For the presenter. Replays the HYPOXIA data pack through the detector.</p>

        <div className="sheet-label">Scenario</div>
        <div className="seg col">
          {Object.entries(cfg.scenarios).map(([id, label]) => (
            <button key={id} className={frame?.scenario === id ? "on" : ""} onClick={() => send({ scenario: id })}>{label}</button>
          ))}
        </div>

        <div className="sheet-label">Speed</div>
        <div className="seg">
          {[1, 5, 10, 20].map((s) => (
            <button key={s} className={frame?.speed === s ? "on" : ""} onClick={() => send({ speed: s })}>{s}×</button>
          ))}
          <button onClick={() => send({ paused: !frame?.paused })}>{frame?.paused ? "Resume" : "Pause"}</button>
        </div>

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
