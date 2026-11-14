import { useEffect, useLayoutEffect, useState } from "react";
import { getJSON, post, useConfig, useTelemetry } from "./api";
import { alertAudio } from "./audio";
import { LEVEL_LABEL, levelClass, met } from "./format";
import type { CrewFrame, Protocol, Session } from "./types";
import { AlertBanner } from "./components/AlertBanner";
import { CrewCard } from "./components/CrewCard";
import { LogView } from "./components/LogView";
import { Patch } from "./components/Patch";
import { ProtocolRunner } from "./components/ProtocolRunner";
import { SimPanel } from "./components/SimPanel";

const W = 1376, H = 1032; // iPad Pro 13" (M4) landscape: 2752 × 2064 px @2x, 4:3
const QS = new URLSearchParams(location.search);
const BARE = QS.has("bare") || matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
type Tab = "monitor" | "hypoxia" | "dcs" | "log";
type Pid = "hypoxia" | "dcs";

function useFit() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const pad = BARE ? 0 : 56;
      setScale(Math.min((innerWidth - pad) / W, (innerHeight - pad) / H, BARE ? 4 : 1));
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);
  return scale;
}

export default function App() {
  const cfg = useConfig();
  const { frame, history, log, linked } = useTelemetry();
  const scale = useFit();
  const [started, setStarted] = useState(QS.has("start"));
  const [tab, setTab] = useState<Tab>("monitor");
  const [protos, setProtos] = useState<Partial<Record<Pid, Protocol>>>({});
  const [sessions, setSessions] = useState<Partial<Record<Pid, Session>>>({});
  const [sim, setSim] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    (["hypoxia", "dcs"] as Pid[]).forEach((p) => getJSON<Protocol>(`/api/protocols/${p}`).then((x) => setProtos((m) => ({ ...m, [p]: x }))));
    const id = setInterval(() => setClock(new Date()), 1000);
    // Deep link, e.g. from the HUD alert: ?tab=hypoxia&crew=EV1
    const deepTab = QS.get("tab") as Tab | null;
    if (deepTab) setTab(deepTab);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (started && frame) alertAudio.update(frame.crew);
  }, [frame, started]);

  useEffect(() => {
    alertAudio.muted = muted;
    if (muted) alertAudio.stop();
  }, [muted]);

  const crewById = (id: string) => frame?.crew.find((c) => c.id === id);
  const evaMinutes = frame ? Math.max(0, Math.round((frame.t - (cfg?.thresholds.baseline_s ?? 240)) / 60)) : 0;

  const start = (pid: Pid, crew: string) => {
    const proto = protos[pid];
    if (!proto) return;
    const existing = sessions[pid];
    if (!existing || existing.crew !== crew) {
      setSessions((s) => ({ ...s, [pid]: { protocol: pid, crew, path: [proto.start], flags: {}, values: {}, picks: {} } }));
      void post("/api/log", { crew, kind: "step", text: `${proto.title} started` });
    }
    setTab(pid);
  };

  useEffect(() => {
    const crewId = QS.get("crew"), pid = QS.get("tab") as Pid | null;
    if (crewId && (pid === "hypoxia" || pid === "dcs") && protos[pid] && !sessions[pid]) start(pid, crewId);
  }, [protos]);

  const ack = (id: string) => void post("/api/ack", { crew: id });

  if (!cfg) return <div className="boot">Connecting to habitat network…</div>;

  const crew = frame?.crew ?? [];
  const worst = crew.reduce<CrewFrame | undefined>((w, c) => (!w || rankOf(c) > rankOf(w) ? c : w), undefined);
  const alarmCount = crew.filter((c) => c.level === "CAUTION" || c.level === "WARNING").length;

  return (
    <div className={`stage ${BARE ? "bare" : ""}`}>
      <div className="device" style={{ transform: `scale(${scale})` }}>
        <div className="screen">
          {!started ? (
            <Launch onStart={() => { alertAudio.unlock(); setStarted(true); }} />
          ) : (
            <>
              <header className="statusbar">
                <div className="sb-left">
                  <Patch size={30} />
                  <div>
                    <div className="app-name">Crew Health</div>
                    <div className="app-sub">Artemis · lunar surface EVA · IV console</div>
                  </div>
                </div>
                <div className="sb-mid num">
                  <div><span className="sb-k">MET</span> {met(frame?.t ?? 0)}</div>
                  <div><span className="sb-k">EVA</span> {frame && frame.t > cfg.thresholds.baseline_s ? met(frame.t - cfg.thresholds.baseline_s) : "pre-EVA"}</div>
                </div>
                <div className="sb-right">
                  <span className={`pill ${linked ? "pill-ok" : "pill-bad"}`}>{linked ? "● TLM LIVE" : "○ LOS"}</span>
                  <span className="num sb-clock">{clock.toISOString().slice(11, 16)} UTC</span>
                  <button className="icon-btn" aria-label={muted ? "Unmute alerts" : "Mute alerts"} onClick={() => setMuted(!muted)}>
                    {muted ? <SpeakerOff /> : <SpeakerOn />}
                  </button>
                  <button className="pill pill-sim" onClick={() => setSim(true)}>SIM</button>
                </div>
              </header>

              <AlertBanner crew={crew} onAck={ack} onRespond={(id) => start("hypoxia", id)} />

              <main className="content">
                {tab === "monitor" && !crew.length && <div className="boot">Waiting for suit telemetry…</div>}
                {tab === "monitor" && (
                  <div className="monitor">
                    {crew.map((c) => (
                      <CrewCard key={c.id} c={c} points={history[c.id] ?? []} th={cfg.thresholds} linked={linked}
                        onRespond={() => start("hypoxia", c.id)} />
                    ))}
                  </div>
                )}
                {(tab === "hypoxia" || tab === "dcs") && protos[tab] && (
                  sessions[tab] ? (
                    <ProtocolRunner
                      proto={protos[tab]!}
                      session={sessions[tab]!}
                      crew={crewById(sessions[tab]!.crew)}
                      points={history[sessions[tab]!.crew] ?? []}
                      th={cfg.thresholds}
                      evaMinutes={evaMinutes}
                      onChange={(s) => setSessions((m) => ({ ...m, [tab]: s }))}
                      onLink={(p) => start(p as Pid, sessions[tab]!.crew)}
                      onClose={() => { setSessions((m) => ({ ...m, [tab]: undefined })); setTab("monitor"); }}
                    />
                  ) : (
                    <CrewPicker title={protos[tab]!.title} crew={crew} suggested={tab === "hypoxia" ? worst : undefined}
                      onPick={(id) => start(tab, id)} />
                  )
                )}
                {tab === "log" && <LogView log={log} crew={crew} history={history} />}
              </main>

              <nav className="tabbar">
                <TabBtn id="monitor" tab={tab} set={setTab} label="Monitor" icon={<IconPulse />} />
                <TabBtn id="hypoxia" tab={tab} set={setTab} label="Hypoxia aid" icon={<IconDrop />}
                  badge={alarmCount || undefined} live={!!sessions.hypoxia} />
                <TabBtn id="dcs" tab={tab} set={setTab} label="DCS check" icon={<IconBubbles />} live={!!sessions.dcs} />
                <TabBtn id="log" tab={tab} set={setTab} label="Log" icon={<IconList />} />
              </nav>
              {sim && frame && <SimPanel cfg={cfg} frame={frame} muted={muted} onMute={setMuted} onClose={() => setSim(false)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function rankOf(c: CrewFrame) {
  return { CALIBRATING: 0, NOMINAL: 0, ADVISORY: 1, CAUTION: 2, WARNING: 3 }[c.level];
}

function Launch({ onStart }: { onStart: () => void }) {
  return (
    <div className="launch">
      <Patch size={148} />
      <h1>Crew Health</h1>
      <p className="launch-sub">IV crew console · lunar surface EVA</p>
      <button className="btn btn-solid launch-btn" onClick={onStart}>Begin monitoring</button>
      <p className="fine">Turns on cabin alert tones and voice.</p>
      <footer className="launch-foot">
        NASA Space Apps Challenge 2026 · Built with NASA open data · Concept prototype, not for medical use
      </footer>
    </div>
  );
}

function CrewPicker({ title, crew, suggested, onPick }: {
  title: string; crew: CrewFrame[]; suggested?: CrewFrame; onPick: (id: string) => void;
}) {
  return (
    <div className="picker">
      <h2 className="step-prompt">{title}: who needs help?</h2>
      <div className="picker-row">
        {crew.map((c) => (
          <button key={c.id} className={`card pick ${levelClass(c.level)} ${suggested?.id === c.id && c.level !== "NOMINAL" ? "suggest" : ""}`}
            onClick={() => onPick(c.id)}>
            <span className="crew-id">{c.id}</span>
            <span className="crew-meta">{c.name} · {c.role}</span>
            <span className={`chip ${levelClass(c.level)}`}>{LEVEL_LABEL[c.level]}</span>
            <span className="pick-spo2 num">SpO₂ {c.spo2_smooth.toFixed(0)} %</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TabBtn({ id, tab, set, label, icon, badge, live }: {
  id: Tab; tab: Tab; set: (t: Tab) => void; label: string; icon: JSX.Element; badge?: number; live?: boolean;
}) {
  return (
    <button className={`tab ${tab === id ? "on" : ""}`} onClick={() => set(id)}>
      <span className="tab-icon">{icon}{badge ? <span className="badge">{badge}</span> : live ? <span className="dot" /> : null}</span>
      <span>{label}</span>
    </button>
  );
}

const svg = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconPulse = () => <svg {...svg}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>;
const IconDrop = () => <svg {...svg}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><path d="M9.5 14.5h5" /></svg>;
const IconBubbles = () => <svg {...svg}><circle cx="8" cy="14" r="4" /><circle cx="16" cy="8" r="3" /><circle cx="17" cy="17" r="2" /></svg>;
const IconList = () => <svg {...svg}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
const SpeakerOn = () => <svg {...svg} width={22} height={22}><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
const SpeakerOff = () => <svg {...svg} width={22} height={22}><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="m22 9-6 6M16 9l6 6" /></svg>;
