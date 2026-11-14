import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getJSON, logStep, post } from "../api";
import { LEVEL_LABEL, fill, levelClass, mmss } from "../format";
import type { CrewFrame, HistoryPoint, ProtoNode, Protocol, Session, Thresholds } from "../types";
import { TrendChart } from "./TrendChart";

interface Props {
  proto: Protocol;
  session: Session;
  crew: CrewFrame | undefined;
  points: HistoryPoint[];
  th: Thresholds;
  evaMinutes: number;
  onChange: (s: Session) => void;
  onLink: (protocol: string) => void;
  onClose: () => void;
}

interface EndReason {
  label: string;
  sub: string;
  resolve: boolean;
  recover: boolean;
}

const END_REASONS: Record<string, EndReason[]> = {
  hypoxia: [
    { label: "Vitals stable, resolved", sub: "SpO₂ back near baseline. Clears the alert.", resolve: true, recover: true },
    { label: "False alarm", sub: "Sensor slip or similar. Alarm returns if SpO₂ stays low.", resolve: true, recover: false },
    { label: "Flight surgeon took over", sub: "Alert stays on until vitals recover.", resolve: false, recover: false },
  ],
  dcs: [
    { label: "Symptoms resolved", sub: "No pain, tingling or rash left.", resolve: false, recover: false },
    { label: "Flight surgeon took over", sub: "Care continues outside the app.", resolve: false, recover: false },
  ],
};

function targets(n: ProtoNode) {
  return [n.next, n.alt?.next, ...Object.values(n.next_if ?? {}), ...(n.options ?? []).map((o) => o.next),
    ...Object.values(n.rules ?? {})].filter((t): t is string => !!t);
}

/** Fewest steps from each node to an end node (end = 0). */
function stepsToEnd(proto: Protocol) {
  const dist: Record<string, number> = {};
  const ids = Object.keys(proto.nodes);
  ids.forEach((id) => { if (proto.nodes[id].type === "end") dist[id] = 0; });
  for (let changed = true; changed;) {
    changed = false;
    for (const id of ids) {
      const best = Math.min(...targets(proto.nodes[id]).map((t) => (dist[t] ?? Infinity) + 1));
      if (best < (dist[id] ?? Infinity)) { dist[id] = best; changed = true; }
    }
  }
  return dist;
}

export function ProtocolRunner({ proto, session, crew, points, th, evaMinutes, onChange, onLink, onClose }: Props) {
  const nodeId = session.path[session.path.length - 1];
  const node = proto.nodes[nodeId];
  const phaseIdx = proto.phases.findIndex((p) => p.id === node.phase);
  const t = (s: string) => fill(s, crew, session.crew);
  const dist = useMemo(() => stepsToEnd(proto), [proto]);
  const done = session.path.length - 1;
  const left = dist[nodeId] ?? 0;
  const progress = done + left ? done / (done + left) : 1;
  const [ending, setEnding] = useState(false);
  const [why, setWhy] = useState(false);
  const isEnd = node.type === "end";

  const go = (next: string | undefined, answer: string, extra?: Partial<Session>) => {
    if (!next) return;
    const flags = { ...session.flags, ...(extra?.flags ?? {}) };
    const target = Object.entries(node.next_if ?? {}).find(([flag]) => flags[flag])?.[1] ?? next;
    logStep(session.crew, "step", `${proto.title} · ${t(node.prompt)} → ${answer}`, { protocol: proto.id, node: nodeId });
    if (node.treat) void post("/api/treat", { crew: session.crew });
    setWhy(false);
    onChange({ ...session, ...extra, flags, path: [...session.path, target] });
  };

  const prev = () => {
    if (session.path.length < 2) return;
    const back = proto.nodes[session.path[session.path.length - 2]];
    logStep(session.crew, "step", `${proto.title} · Previous → back to “${t(back.prompt)}”`);
    setWhy(false);
    onChange({ ...session, path: session.path.slice(0, -1) });
  };

  const finish = (reason: string, resolve: boolean, recover: boolean) => {
    logStep(session.crew, "step", `${proto.title} ended: ${reason}`);
    if (resolve) void post("/api/resolve", { crew: session.crew, reason, recover });
    onClose();
  };
  const complete = () => finish("Response complete", proto.id === "hypoxia", true);

  const nav = { canPrev: session.path.length > 1, onPrev: prev };

  return (
    <div className="runner">
      <aside className="rail">
        {crew && (
          <div className={`card patient ${levelClass(crew.level)}`}>
            <div className="patient-head">
              <span className="crew-id sm">{crew.id}</span>
              <span className={`chip ${levelClass(crew.level)}`}>{LEVEL_LABEL[crew.level]}</span>
            </div>
            <div className="patient-row">
              <div>
                <div className="hero-label">SpO₂</div>
                <div className="patient-spo2 num">{crew.spo2_smooth.toFixed(0)}<span className="unit">%</span></div>
              </div>
              <div className="patient-mini num">
                <div><span>HR</span> {crew.hr}</div>
                <div><span>Suit</span> {crew.suit_psia.toFixed(1)}</div>
                <div><span>Base</span> {crew.baseline ? crew.baseline.spo2_mean.toFixed(0) : "—"}</div>
              </div>
            </div>
            <TrendChart points={points} baseline={crew.baseline} th={th} width={310} height={84} compact />
            {crew.treated && <div className="treated">Emergency O₂ on</div>}
          </div>
        )}
        <ol className="phases">
          {proto.phases.map((p, i) => (
            <li key={p.id} className={i < phaseIdx || isEnd ? "done" : i === phaseIdx ? "now" : ""}>
              <span className="phase-dot">{i < phaseIdx || isEnd ? "✓" : i + 1}</span>
              {p.title}
            </li>
          ))}
        </ol>
        <button className="btn btn-quiet wide" onClick={() => (isEnd ? complete() : setEnding(true))}>End response</button>
      </aside>

      <section className="step card">
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="step-top">
          <span className="step-kicker">
            {proto.title} · {session.crew} · Step {session.path.length}
            {!isEnd && <span className="step-left"> · about {left} left</span>}
          </span>
          {node.why && node.why.length > 0 && (
            <button className={`info-btn ${why ? "on" : ""}`} aria-label="Why this step" onClick={() => setWhy(!why)}>i</button>
          )}
        </div>
        <h2 className="step-prompt">{t(node.prompt)}</h2>
        {node.detail && <p className="step-detail">{t(node.detail)}</p>}
        {why && node.why && (
          <div className="why-pop">
            {node.why.map((w, i) => <p key={i}>{w.text} <cite>{w.source}</cite></p>)}
          </div>
        )}

        <div className="step-body" key={`${nodeId}-${session.path.length}`}>
          {node.type === "question" && (
            <Question node={node} t={t} initial={session.picks[nodeId]?.[0]} nav={nav}
              onNext={(i) => {
                const o = node.options![i];
                go(o.next, o.label, { picks: { ...session.picks, [nodeId]: [String(i)] }, ...(o.set ? { flags: o.set } : {}) });
              }} />
          )}
          {node.type === "action" && <Action node={node} t={t} nav={nav} onDone={(label, next) => go(next, label)} onLink={onLink} />}
          {node.type === "select" && (
            <Select node={node} initial={session.picks[nodeId] ?? []} nav={nav}
              onNext={(next, labels, ids) => go(next, labels, { picks: { ...session.picks, [nodeId]: ids } })} />
          )}
          {node.type === "number" && (
            <NumberStep node={node} initial={session.values[node.field!] ?? evaMinutes} nav={nav}
              onNext={(v) => go(node.next, `${v} ${node.unit}`, { values: { ...session.values, [node.field!]: v } })} />
          )}
          {node.type === "dcs_model" && <DcsModel tsMin={session.values.ts_min ?? evaMinutes} nav={nav} onNext={() => go(node.next, "Reviewed")} />}
          {isEnd && (
            <>
              <div className="end fill">
                <div className="end-mark">✓</div>
                <p className="step-detail">All steps are in the Log.</p>
              </div>
              <Nav {...nav} label="Finish" onNext={complete} />
            </>
          )}
        </div>

        {ending && (
          <div className="sheet-backdrop inset" onClick={() => setEnding(false)}>
            <div className="end-sheet" onClick={(e) => e.stopPropagation()}>
              <h3 className="step-prompt sm">End the {proto.title.toLowerCase()} for {session.crew}? Why?</h3>
              <div className="choices">
                {END_REASONS[proto.id].map((r) => (
                  <button key={r.label} className="choice" onClick={() => finish(r.label, r.resolve, r.recover)}>
                    <span>
                      <span className="choice-label">{r.label}</span>
                      <span className="choice-sub">{r.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn btn-quiet wide" onClick={() => setEnding(false)}>Keep going</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface NavProps {
  canPrev: boolean;
  onPrev: () => void;
  label?: string;
  disabled?: boolean;
  onNext: () => void;
  children?: ReactNode;
}

function Nav({ canPrev, onPrev, label = "Next", disabled, onNext, children }: NavProps) {
  return (
    <div className="nav">
      <button className="btn btn-quiet nav-btn" disabled={!canPrev} onClick={onPrev}>‹ Previous</button>
      <div className="nav-mid">{children}</div>
      <button className="btn btn-solid nav-btn" disabled={disabled} onClick={onNext}>{label} ›</button>
    </div>
  );
}

type NavBase = { canPrev: boolean; onPrev: () => void };

function Question({ node, t, initial, nav, onNext }: {
  node: ProtoNode; t: (s: string) => string; initial?: string; nav: NavBase; onNext: (i: number) => void;
}) {
  const [sel, setSel] = useState<number | null>(initial != null ? Number(initial) : null);
  return (
    <>
      <div className="choices fill" role="radiogroup">
        {node.options!.map((o, i) => (
          <button key={i} role="radio" aria-checked={sel === i}
            className={`choice tone-${o.tone ?? "good"} ${sel === i ? "sel" : ""}`} onClick={() => setSel(i)}>
            <span className="choice-key">{String.fromCharCode(65 + i)}</span>
            <span>
              <span className="choice-label">{t(o.label)}</span>
              {o.sub && <span className="choice-sub">{t(o.sub)}</span>}
            </span>
          </button>
        ))}
      </div>
      <Nav {...nav} disabled={sel === null} onNext={() => sel !== null && onNext(sel)} />
    </>
  );
}

function Action({ node, t, nav, onDone, onLink }: {
  node: ProtoNode; t: (s: string) => string; nav: NavBase; onDone: (label: string, next?: string) => void; onLink: (p: string) => void;
}) {
  const steps = node.steps ?? [];
  const [done, setDone] = useState<boolean[]>(steps.map(() => false));
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const allDone = done.every(Boolean);
  return (
    <>
      <ul className="checklist fill">
        {steps.map((s, i) => (
          <li key={i}>
            <button className={`check ${done[i] ? "on" : ""}`} onClick={() => setDone((cur) => cur.map((d, j) => (j === i ? !d : d)))}>
              <span className="box">{done[i] ? "✓" : ""}</span>
              <span>{t(s)}</span>
            </button>
          </li>
        ))}
      </ul>
      <Nav {...nav} disabled={!allDone} label={allDone ? (node.confirm ?? "Next") : `Tick all ${steps.length}`}
        onNext={() => onDone(node.confirm ?? "Done", node.next)}>
        {node.timer_s && (
          left === null ? (
            <button className="btn btn-ghost" onClick={() => setLeft(node.timer_s!)}>Start {mmss(node.timer_s)} timer</button>
          ) : left > 0 ? (
            <span className="timer">
              <span className="timer-value num">{mmss(left)}</span>
              <button className="btn btn-quiet sm" onClick={() => setLeft(0)}>Skip</button>
            </span>
          ) : (
            <span className="timer-done">Time is up</span>
          )
        )}
        {node.link && <button className="btn btn-ghost" onClick={() => onLink(node.link!.protocol)}>{node.link.label}</button>}
        {node.alt && <button className="btn btn-warn" onClick={() => onDone(node.alt!.label, node.alt!.next)}>{node.alt.label}</button>}
      </Nav>
    </>
  );
}

function Select({ node, initial, nav, onNext }: {
  node: ProtoNode; initial: string[]; nav: NavBase; onNext: (next: string, labels: string, ids: string[]) => void;
}) {
  const [on, setOn] = useState<Set<string>>(new Set(initial));
  const opts = node.options!;
  const picked = opts.filter((o) => on.has(o.id!));
  const next = () => {
    const groups = new Set(picked.map((o) => o.group));
    const rules = node.rules!;
    const key = Object.keys(rules).find((k) => groups.has(k)) ?? "none";
    onNext(rules[key], picked.length ? picked.map((o) => o.label).join(", ") : "None", picked.map((o) => o.id!));
  };
  return (
    <>
      <div className="tiles fill">
        {opts.map((o) => (
          <button key={o.id} className={`tile ${on.has(o.id!) ? "on" : ""}`}
            onClick={() => setOn((s) => { const n = new Set(s); n.has(o.id!) ? n.delete(o.id!) : n.add(o.id!); return n; })}>
            <span className="box">{on.has(o.id!) ? "✓" : ""}</span>
            <span>
              <span className="choice-label">{o.label}</span>
              {o.sub && <span className="choice-sub">{o.sub}</span>}
            </span>
          </button>
        ))}
      </div>
      <Nav {...nav} label={picked.length ? `Next (${picked.length} selected)` : "None of these"} onNext={next} />
    </>
  );
}

function NumberStep({ node, initial, nav, onNext }: { node: ProtoNode; initial: number; nav: NavBase; onNext: (v: number) => void }) {
  const [v, setV] = useState(Math.round(initial));
  const clamp = (n: number) => Math.max(node.min ?? 0, Math.min(node.max ?? 999, n));
  return (
    <>
      <div className="stepper fill">
        <button className="btn btn-ghost big" onClick={() => setV(clamp(v - 10))}>−10</button>
        <button className="btn btn-ghost big" onClick={() => setV(clamp(v - 1))}>−1</button>
        <div className="number-value num">{v}<span className="unit">{node.unit}</span></div>
        <button className="btn btn-ghost big" onClick={() => setV(clamp(v + 1))}>+1</button>
        <button className="btn btn-ghost big" onClick={() => setV(clamp(v + 10))}>+10</button>
      </div>
      <Nav {...nav} onNext={() => onNext(v)} />
    </>
  );
}

interface DcsOptions {
  ts_min: number;
  options: { id: string; label: string; detail: string; dp_psid: number; p_resolution: number }[];
  note: string;
  source: string;
}

function DcsModel({ tsMin, nav, onNext }: { tsMin: number; nav: NavBase; onNext: () => void }) {
  const [data, setData] = useState<DcsOptions | null>(null);
  useEffect(() => {
    getJSON<DcsOptions>(`/api/dcs/options?ts_min=${tsMin}&ambulation=true`).then(setData);
  }, [tsMin]);
  return (
    <>
      <div className="dcs-model fill">
        {!data && <p className="step-detail">Running NASA model…</p>}
        {data?.options.map((o) => (
          <div key={o.id} className="prob">
            <div className="prob-head">
              <span className="choice-label">{o.label}</span>
              <span className="prob-value num">{Math.round(o.p_resolution * 100)} %</span>
            </div>
            <div className="meter-track tall">
              <div className="meter-fill prob-fill" style={{ width: `${o.p_resolution * 100}%` }} />
            </div>
            <div className="choice-sub">{o.detail} · +{o.dp_psid} psi over suit pressure</div>
          </div>
        ))}
        {data && (
          <p className="step-detail small">
            Symptom at {data.ts_min} min into a walking EVA. {data.note} <cite>{data.source}</cite>
          </p>
        )}
      </div>
      <Nav {...nav} label="Start treatment" disabled={!data} onNext={onNext} />
    </>
  );
}
