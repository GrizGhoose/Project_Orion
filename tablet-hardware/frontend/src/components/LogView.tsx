import type { CrewFrame, HistoryPoint, LogEntry } from "../types";
import { met } from "../format";

interface Props {
  log: LogEntry[];
  crew: CrewFrame[];
  history: Record<string, HistoryPoint[]>;
}

const KIND: Record<string, string> = { alert: "Alert", ack: "Ack", step: "Step", baseline: "Baseline", sim: "System" };

// Lowest SpO₂ over the kept history, ignoring seconds with no reading.
function lowest(h: HistoryPoint[]) {
  const v = h.map((p) => p.spo2).filter((x): x is number => x != null);
  return v.length ? Math.min(...v) : null;
}

export function LogView({ log, crew, history }: Props) {
  const download = () => {
    const report = {
      generated_utc: new Date().toISOString(),
      crew: crew.map((c) => {
        const h = history[c.id] ?? [];
        return {
          id: c.id, level: c.level, spo2_now: c.spo2_smooth, baseline: c.baseline,
          lowest_spo2_last_6_min: lowest(h),
          suit_psia: c.suit_psia, hr: c.hr, reaction: c.reaction,
        };
      }),
      events: log,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `handoff-${Date.now()}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="logview">
      <section className="card log-list">
        <h2 className="section-title">Event log</h2>
        <ol>
          {[...log].reverse().map((e, i) => (
            <li key={i} className={`log-row kind-${e.kind} ${e.extra?.level ? `lv-${String(e.extra.level).toLowerCase()}` : ""}`}>
              <span className="num log-met">T+{met(e.met_s)}</span>
              <span className="log-crew">{e.crew}</span>
              <span className="log-kind">{KIND[e.kind] ?? e.kind}</span>
              <span className="log-text">{e.text}</span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="card handoff">
        <h2 className="section-title">Hand-off to flight surgeon</h2>
        {crew.map((c) => {
          const h = history[c.id] ?? [];
          const low = lowest(h) ?? c.spo2_smooth;
          return (
            <div key={c.id} className="handoff-crew">
              <div className="crew-id sm">{c.id}</div>
              <dl className="num">
                <dt>Status</dt><dd>{c.level}</dd>
                <dt>SpO₂ now</dt><dd>{c.spo2_smooth.toFixed(0)} %</dd>
                <dt>Lowest (6 min)</dt><dd>{low.toFixed(0)} %</dd>
                <dt>Baseline</dt><dd>{c.baseline ? `${c.baseline.spo2_mean.toFixed(1)} %` : "—"}</dd>
                <dt>Steps logged</dt><dd>{log.filter((e) => e.crew === c.id && e.kind === "step").length}</dd>
              </dl>
            </div>
          );
        })}
        <button className="btn btn-solid wide" onClick={download}>Download report</button>
        <p className="fine">Sends with the next comm pass. The full log goes too.</p>
      </aside>
    </div>
  );
}
