/**
 * In-browser stand-in for the Python backend, used by the hosted (Vercel) build.
 * Mirrors backend/app/mission.py: same messages, same API paths. The hosted build has no NASA tab.
 * There are no ESP32 boards here, so the monitor is fed a simulated board time series
 * (SpO₂, HR, HRV, breathing, suit pressure; backend/export_demo.py) and a simulated HUD reaction check.
 */
import type { AppConfig, CrewFrame, LogEntry, Protocol, Session } from "../types";
import { HypoxiaDetector, type DetOut, type FullThresholds } from "./detector";

interface SensorFeed { spo2: number[]; hr: number[]; hrv: number[]; rr: number[]; suit: number[]; eq: number[] }
interface DemoData {
  config: AppConfig & { thresholds: FullThresholds };
  protocols: Record<string, Protocol>;
  dcs_options: { id: string; label: string; detail: string; total_psia: number }[];
  max: Record<string, SensorFeed>;
}
type Msg = Record<string, unknown> & { type: string };
type Crew = AppConfig["crew"][number];
type Point = { t: number; crew: { id: string; spo2: number | null; hr: number | null; level: string }[] };

const SPO2_TAU = 20, SUIT_TAU = 5, SUIT_NOMINAL = 4.3, HISTORY_S = 360;
const SENSOR = { url: "Simulated board feed (hosted demo)", connected: true, age_s: 0, error: null, simulated: true };
const RANK = { CALIBRATING: 0, NOMINAL: 0, ADVISORY: 1, CAUTION: 2, WARNING: 3 } as const;

function rng(seed: number) {
  let a = seed >>> 0;
  const uni = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { gauss: (sd: number) => sd * Math.sqrt(-2 * Math.log(uni() || 1e-9)) * Math.cos(2 * Math.PI * uni()) };
}
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const baseline = (d: DetOut) =>
  d.baseline ? { spo2_mean: r2(d.baseline.spo2_mean), spo2_sd: r2(d.baseline.spo2_sd), hr_mean: r2(d.baseline.hr_mean), hr_sd: r2(d.baseline.hr_sd) } : null;
const detFields = (d: DetOut) => ({
  spo2_smooth: r1(d.spo2_smooth), signal: d.signal, level: d.level, z: r2(d.z), hr_z: r2(d.hr_z), baseline: baseline(d),
  below_caution_s: d.below_caution_s, below_warning_s: d.below_warning_s, slope_per_min: r2(d.slope_per_min),
  startle: d.startle, reasons: d.reasons, calibration_left_s: d.calibration_left_s,
  phase: (d.level === "CALIBRATING" ? "PRE-EVA" : "EVA") as CrewFrame["phase"],
});

/** One crewmember's simulated board. Emergency O₂ brings SpO₂, HR and suit pressure back to normal. */
class SensorTrack {
  det: HypoxiaDetector;
  rand: ReturnType<typeof rng>;
  ackedLevel: string | null = null;
  reaction: CrewFrame["reaction"] = null;
  last: CrewFrame | null = null;
  treatedAt: number | null = null;
  treatFrom: { spo2: number; hr: number; suit: number; eq: number } | null = null;

  constructor(public crew: Crew, private feed: SensorFeed, private th: FullThresholds, seed: number) {
    this.det = new HypoxiaDetector(th);
    this.rand = rng(seed + 1);
  }

  treat(t: number) {
    if (this.treatedAt === null && this.last) {
      this.treatedAt = t;
      this.treatFrom = { spo2: this.last.spo2_smooth, hr: this.last.hr ?? this.det.hrMu, suit: this.last.suit_psia ?? SUIT_NOMINAL, eq: this.last.eq_alt_m ?? 0 };
    }
  }

  private reading(t: number) {
    const d = this.feed;
    const raw = { spo2: d.spo2[t], hr: d.hr[t], hrv: d.hrv[t], rr: d.rr[t], suit: d.suit[t], eq: d.eq[t] };
    const f = this.treatFrom;
    if (this.treatedAt === null || !f || !this.det.calibrated) return raw;
    const dt = t - this.treatedAt;
    const k = 1 - Math.exp(-dt / SPO2_TAU), kP = 1 - Math.exp(-dt / SUIT_TAU);
    return {
      ...raw,
      spo2: Math.round(f.spo2 + (this.det.mu! - f.spo2) * k + this.rand.gauss(0.4)),
      hr: Math.round(f.hr + (this.det.hrMu - f.hr) * k + this.rand.gauss(1.2)),
      suit: f.suit + (SUIT_NOMINAL - f.suit) * kP + this.rand.gauss(0.01),
      eq: f.eq * (1 - kP),
    };
  }

  step(t: number): CrewFrame {
    const r = this.reading(t);
    const d = this.det.update(r.spo2, r.hr);
    if (this.det.calibrated && d.signal && t % this.th.reaction_every_s === 0) {
      const ms = d.spo2_smooth < 84 ? null : Math.round(330 + Math.max(0, -d.z) * 45 + this.rand.gauss(25));
      this.reaction = { ms, missed: ms === null };
    }
    if (RANK[d.level] < RANK[(this.ackedLevel ?? "NOMINAL") as keyof typeof RANK]) this.ackedLevel = null;
    this.last = {
      ...this.crew, ...detFields(d),
      spo2: r.spo2, hr: r.hr, hr_delta: d.baseline ? Math.round(r.hr - d.baseline.hr_mean) : 0,
      hrv: r.hrv, resp: r.rr, suit_psia: r2(r.suit), eq_alt_m: Math.round(r.eq),
      reaction: this.reaction, acked: this.ackedLevel === d.level, treated: this.treatedAt !== null, sensor: SENSOR,
    };
    return this.last;
  }
}

class Engine {
  data!: DemoData;
  ready: Promise<void>;
  speed = 1; // mission seconds per real second: real time, so the 10 s baseline and the 20 s EV1 alarm happen on the clock
  t = 0;
  log: LogEntry[] = [];
  sessions: Record<string, Session> = {};
  private tracks: SensorTrack[] = [];
  private history: Point[] = [];
  private levels: Record<string, string | null> = {};
  private lastAdvisoryLog: Record<string, number> = {};
  private subs = new Set<(m: Msg) => void>();
  private timer: number | undefined;

  constructor() {
    this.ready = fetch("/demo/data.json").then((r) => r.json()).then((d: DemoData) => {
      this.data = d;
      this.restart(false);
      this.loop();
    });
  }

  private get th() {
    return this.data.config.thresholds;
  }

  private get length() {
    return Math.min(...Object.values(this.data.max).map((f) => f.spo2.length));
  }

  // ---------- mission (backend/app/mission.py) ----------
  private restart(log = true) {
    this.t = 0;
    this.tracks = this.data.config.crew.map((c, i) => new SensorTrack(c, this.data.max[c.id], this.th, i));
    this.history = [];
    this.levels = Object.fromEntries(this.data.config.crew.map((c) => [c.id, null]));
    this.lastAdvisoryLog = {};
    if (log) this.addLog("SYSTEM", "sim", "Baseline restarted: recording each crewmember's personal baseline");
  }

  private addLog(crew: string, kind: string, text: string, extra?: Record<string, unknown>) {
    const e: LogEntry = { utc: new Date().toISOString().slice(0, 19) + "+00:00", met_s: this.t, crew, kind, text, ...(extra ? { extra } : {}) };
    this.log.push(e);
    return e;
  }

  private track(id: string) {
    return this.tracks.find((x) => x.crew.id === id);
  }

  private tick(): [Msg, LogEntry[]] {
    if (this.t >= this.length) {
      // End of the simulated feed: start over with a fresh baseline, as "Restart baseline" does.
      this.restart();
      this.emit({ type: "reset", log: this.log, sessions: this.sessions });
    }
    const newLog: LogEntry[] = [];
    const crew = this.tracks.map((tr) => {
      const c = tr.step(this.t);
      const prev = this.levels[c.id];
      const quietAdv = (prev === "ADVISORY" || c.level === "ADVISORY") && RANK[c.level] <= 1 && this.t - (this.lastAdvisoryLog[c.id] ?? -999) < 60;
      if (prev && prev !== "CALIBRATING" && c.level !== prev && !quietAdv) {
        if (c.level === "ADVISORY" || prev === "ADVISORY") this.lastAdvisoryLog[c.id] = this.t;
        newLog.push(this.addLog(c.id, "alert", `${title(prev)} → ${title(c.level)}. SpO₂ ${c.spo2_smooth.toFixed(0)} %, z ${c.z >= 0 ? "+" : ""}${c.z.toFixed(1)}. ${c.reasons[0]}`, { level: c.level }));
      }
      if (prev === "CALIBRATING" && c.level !== "CALIBRATING" && c.baseline) {
        const b = c.baseline;
        newLog.push(this.addLog(c.id, "baseline", `Baseline set: SpO₂ ${b.spo2_mean.toFixed(1)} ± ${b.spo2_sd.toFixed(1)} %, HR ${b.hr_mean.toFixed(0)} bpm`));
      }
      this.levels[c.id] = c.level;
      return c;
    });
    this.history.push({ t: this.t, crew: crew.map((c) => ({ id: c.id, spo2: c.signal ? c.spo2_smooth : null, hr: c.hr, level: c.level })) });
    if (this.history.length > HISTORY_S) this.history.shift();
    const frame = { type: "frame", t: this.t, eva_start_s: this.th.baseline_s, crew };
    this.t += 1;
    return [frame, newLog];
  }

  private loop() {
    const [f, newLog] = this.tick();
    this.emit(f);
    newLog.forEach((entry) => this.emit({ type: "log", entry }));
    this.timer = window.setTimeout(() => this.loop(), 1000 / this.speed);
  }

  // ---------- transport ----------
  private emit(m: Msg) {
    this.subs.forEach((fn) => fn(m));
  }

  subscribe(fn: (m: Msg) => void) {
    this.subs.add(fn);
    void this.ready.then(() => fn({ type: "history", frames: this.history, log: this.log, sessions: this.sessions }));
    return () => this.subs.delete(fn);
  }

  setSpeed(speed: number) {
    this.speed = Math.max(1, Math.min(speed, 20));
    clearTimeout(this.timer);
    this.loop();
  }

  async get(path: string): Promise<unknown> {
    await this.ready;
    const url = new URL(path, location.origin);
    if (url.pathname === "/api/config") return this.data.config;
    if (url.pathname === "/api/log") return this.log;
    if (url.pathname.startsWith("/api/protocols/")) return this.data.protocols[url.pathname.split("/").pop()!];
    if (url.pathname === "/api/dcs/options") return this.dcsOptions(Number(url.searchParams.get("ts_min") ?? 180), url.searchParams.get("ambulation") !== "false");
    throw new Error(`demo: no GET ${path}`);
  }

  async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    await this.ready;
    let entry: LogEntry | null = null;
    const tr = this.track(String(body.crew));
    if (path === "/api/baseline/restart") {
      this.restart();
      this.sessions = {};
      this.emit({ type: "reset", log: this.log, sessions: this.sessions });
    } else if (path === "/api/ack" && tr?.last) {
      tr.ackedLevel = tr.last.level;
      tr.last.acked = true;
      entry = this.addLog(tr.crew.id, "ack", `${title(tr.last.level)} acknowledged on tablet`);
    } else if (path === "/api/treat" && tr) {
      tr.treat(this.t);
      entry = this.addLog(tr.crew.id, "treat", "Emergency O₂ started per response checklist");
    } else if (path === "/api/resolve" && tr) {
      const recover = body.recover !== false;
      if (recover) tr.treat(this.t);
      tr.det.resolve(recover ? 60 : 0);
      tr.ackedLevel = null;
      entry = this.addLog(tr.crew.id, "resolve", `Alert resolved by crew: ${body.reason}`);
    } else if (path === "/api/log") {
      entry = this.addLog(String(body.crew), String(body.kind), String(body.text), body.extra as Record<string, unknown>);
    }
    if (entry) this.emit({ type: "log", entry });
    return entry ?? { ok: true };
  }

  async putSession(s: Session) {
    await this.ready;
    const key = `${s.protocol}:${s.crew}`;
    this.sessions[key] = { ...s, updated: Date.now() / 1000 };
    this.emit({ type: "session", key, session: this.sessions[key] });
  }

  async deleteSession(protocol: string, crew: string) {
    await this.ready;
    const key = `${protocol}:${crew}`;
    delete this.sessions[key];
    this.emit({ type: "session", key, session: null });
  }

  private dcsOptions(tsMin: number, ambulation: boolean) {
    const site = 4.3;
    const p = (dp: number) => (dp <= 0 ? 0 : 1 / (1 + Math.exp(-(Math.log(dp) - 1.51 + 0.795 * (ambulation ? 1 : 0) - 0.00308 * tsMin) / 0.478)));
    return {
      ts_min: tsMin, ambulation, site_psia: site,
      options: this.data.dcs_options.map((o) => {
        const dp = o.total_psia - site;
        return { ...o, dp_psid: Math.round(dp * 10) / 10, p_resolution: Math.round(p(dp) * 100) / 100 };
      }),
      note: "Probability symptoms resolve on reaching that pressure. 2 h of 100 % O₂ at 8.2 psia raised it to 0.99 in NASA's Mars EVA case (TP-2014-218561 p. vi).",
      source: "NASA TP-2014-218561, Hypobaric Decompression Sickness Treatment Model, p. vi and p. 23",
    };
  }
}

let engine: Engine | null = null;
export function demoEngine() {
  if (!engine) {
    engine = new Engine();
    (window as unknown as { __demo: Engine }).__demo = engine;
  }
  return engine;
}
