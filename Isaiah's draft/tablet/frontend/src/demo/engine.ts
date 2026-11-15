/**
 * In-browser stand-in for the Python backend, used by the hosted (Vercel) build.
 * Mirrors backend/app/sim.py and server.py: same messages, same API paths.
 * State is replayed from saved actions on reload, so a refresh resumes the mission.
 */
import type { AppConfig, CrewFrame, LogEntry, Protocol, Session } from "../types";
import { HypoxiaDetector, type DetOut, type FullThresholds } from "./detector";

type Kind = "hypoxia" | "startle" | "nominal";
interface Stream { spo2: (number | null)[]; hr: (number | null)[]; hrv: (number | null)[]; resp: (number | null)[]; suit: number[]; eq: number[] }
interface DemoData {
  config: AppConfig & { thresholds: FullThresholds; scenario_kinds: Record<string, Record<string, Kind>> };
  protocols: Record<string, Protocol>;
  dcs_options: { id: string; label: string; detail: string; total_psia: number }[];
  length: number;
  streams: Record<Kind, Stream>;
}
type Msg = Record<string, unknown> & { type: string };
interface Action { t: number; kind: "treat" | "resolve" | "ack"; crew: string; recover?: boolean; reason?: string }

const SUIT_NOMINAL = 4.3, SUIT_TAU = 5, SPO2_TAU = 20, HISTORY_S = 360;
const STORE = "crew-health-demo-v1";
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
const fin = (v: number | null | undefined): v is number => v != null && !Number.isNaN(v);
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

class CrewTrack {
  det: HypoxiaDetector;
  rand: ReturnType<typeof rng>;
  reaction: CrewFrame["reaction"] = null;
  ackedLevel: string | null = null;
  last: CrewFrame | null = null;
  treatedAt: number | null = null;
  treatFrom: CrewFrame | null = null;

  constructor(public crew: AppConfig["crew"][number], private s: Stream, th: FullThresholds, seed: number) {
    this.det = new HypoxiaDetector(th);
    this.rand = rng(seed + 1);
  }

  treat(t: number) {
    if (this.treatedAt === null) {
      this.treatedAt = t;
      this.treatFrom = this.last;
    }
  }

  private sample(t: number) {
    const i = Math.min(t, this.s.spo2.length - 1);
    const raw = { spo2: this.s.spo2[i], hr: this.s.hr[i], hrv: this.s.hrv[i], resp: this.s.resp[i], suit: this.s.suit[i], eq: this.s.eq[i] };
    const f = this.treatFrom;
    if (this.treatedAt === null || !this.det.calibrated || !f) return raw;
    const dt = t - this.treatedAt;
    const kS = 1 - Math.exp(-dt / SPO2_TAU), kP = 1 - Math.exp(-dt / SUIT_TAU);
    const mu = this.det.mu!, hrMu = this.det.hrMu;
    return {
      ...raw,
      spo2: f.spo2_smooth + (mu - f.spo2_smooth) * kS + this.rand.gauss(0.25),
      hr: f.hr + (hrMu - f.hr) * kS + ((raw.hr ?? hrMu) - hrMu) * 0.5 + this.rand.gauss(1.2),
      suit: f.suit_psia + (SUIT_NOMINAL - f.suit_psia) * kP + this.rand.gauss(0.01),
      eq: f.eq_alt_m * (1 - kP),
    };
  }

  step(t: number, th: FullThresholds): CrewFrame {
    const s = this.sample(t);
    const d: DetOut = this.det.update(s.spo2, s.hr);
    if (this.det.calibrated && d.signal && t % th.reaction_every_s === 0) {
      const ms = d.spo2_smooth < 84 ? null : Math.round(330 + Math.max(0, -d.z) * 45 + this.rand.gauss(25));
      this.reaction = { t, ms, missed: ms === null };
    }
    if (RANK[d.level] < RANK[(this.ackedLevel ?? "NOMINAL") as keyof typeof RANK]) this.ackedLevel = null;
    const b = d.baseline;
    this.last = {
      ...this.crew,
      spo2: fin(s.spo2) ? r1(s.spo2) : (null as unknown as number), spo2_smooth: r1(d.spo2_smooth), signal: d.signal,
      hr: Math.round(fin(s.hr) ? s.hr : this.det.lastHr ?? 80), hr_delta: b ? Math.round((s.hr ?? b.hr_mean) - b.hr_mean) : 0,
      hrv: fin(s.hrv) ? Math.round(s.hrv) : null, resp: fin(s.resp) ? r1(s.resp) : null,
      suit_psia: r2(s.suit), eq_alt_m: Math.round(s.eq),
      level: d.level, z: r2(d.z), hr_z: r2(d.hr_z),
      baseline: b ? { spo2_mean: r2(b.spo2_mean), spo2_sd: r2(b.spo2_sd), hr_mean: r2(b.hr_mean), hr_sd: r2(b.hr_sd) } : null,
      below_caution_s: d.below_caution_s, below_warning_s: d.below_warning_s, slope_per_min: r2(d.slope_per_min),
      startle: d.startle, reasons: d.reasons, calibration_left_s: d.calibration_left_s,
      reaction: this.reaction, acked: this.ackedLevel === d.level,
      phase: d.level === "CALIBRATING" ? "PRE-EVA" : "EVA", treated: this.treatedAt !== null,
    };
    return this.last;
  }
}

class Engine {
  data!: DemoData;
  ready: Promise<void>;
  speed = 5;
  paused = false;
  scenario = "demo";
  t = 0;
  log: LogEntry[] = [];
  sessions: Record<string, Session> = {};
  actions: Action[] = [];
  private tracks: CrewTrack[] = [];
  private history: { t: number; crew: { id: string; spo2: number; hr: number; level: string }[] }[] = [];
  private levels: Record<string, string | null> = {};
  private lastAdvisoryLog: Record<string, number> = {};
  private subs = new Set<(m: Msg) => void>();
  private timer: number | undefined;

  constructor() {
    this.ready = fetch("/demo/data.json").then((r) => r.json()).then((d: DemoData) => {
      this.data = d;
      this.restore();
      this.loop();
    });
  }

  private get th() {
    return this.data.config.thresholds;
  }

  // ---------- mission ----------
  private build(scenario: string) {
    this.scenario = scenario;
    this.paused = false;
    this.t = 0;
    const kinds = this.data.config.scenario_kinds[scenario];
    this.tracks = this.data.config.crew.map((c, i) => new CrewTrack(c, this.data.streams[kinds[c.id]], this.th, i));
    this.history = [];
    this.levels = Object.fromEntries(this.data.config.crew.map((c) => [c.id, null]));
    this.lastAdvisoryLog = {};
  }

  private reset(scenario: string) {
    this.build(scenario);
    this.log = [];
    this.sessions = {};
    this.actions = [];
    this.addLog("SYSTEM", "sim", `Scenario loaded: ${this.data.config.scenarios[scenario]}`);
  }

  private addLog(crew: string, kind: string, text: string, extra?: Record<string, unknown>) {
    const e: LogEntry = { utc: new Date().toISOString().slice(0, 19) + "+00:00", met_s: this.t, crew, kind, text, ...(extra ? { extra } : {}) };
    this.log.push(e);
    return e;
  }

  private apply(a: Action, record: boolean) {
    const tr = this.tracks.find((x) => x.crew.id === a.crew);
    if (!tr) return null;
    if (record) this.actions.push({ ...a, t: this.t });
    if (a.kind === "treat") {
      if (tr.treatedAt !== null) return null;
      tr.treat(this.t);
      return record ? this.addLog(a.crew, "treat", "Emergency O₂ on. Vitals should recover within about a minute") : null;
    }
    if (a.kind === "resolve") {
      if (a.recover) tr.treat(this.t);
      tr.det.resolve(a.recover ? 60 : 0);
      tr.ackedLevel = null;
      return record ? this.addLog(a.crew, "resolve", `Alert resolved by crew: ${a.reason}`) : null;
    }
    if (tr.last) {
      tr.ackedLevel = tr.last.level;
      tr.last.acked = true;
      return record ? this.addLog(a.crew, "ack", `${title(tr.last.level)} acknowledged on tablet`) : null;
    }
    return null;
  }

  private tick(quiet = false): [Msg, LogEntry[]] {
    if (this.paused && this.tracks.every((x) => x.last)) return [this.frame(this.tracks.map((x) => x.last!)), []];
    const newLog: LogEntry[] = [];
    const crew = this.tracks.map((tr) => {
      const c = tr.step(this.t, this.th);
      const prev = this.levels[c.id];
      const quietAdv = (prev === "ADVISORY" || c.level === "ADVISORY") && RANK[c.level] <= 1 && this.t - (this.lastAdvisoryLog[c.id] ?? -999) < 60;
      if (!quiet && prev && prev !== "CALIBRATING" && c.level !== prev && !quietAdv) {
        if (c.level === "ADVISORY" || prev === "ADVISORY") this.lastAdvisoryLog[c.id] = this.t;
        newLog.push(this.addLog(c.id, "alert", `${title(prev)} → ${title(c.level)}. SpO₂ ${c.spo2_smooth.toFixed(0)} %, z ${c.z >= 0 ? "+" : ""}${c.z.toFixed(1)}. ${c.reasons[0]}`, { level: c.level }));
      }
      if (!quiet && prev === "CALIBRATING" && c.level !== "CALIBRATING" && c.baseline) {
        const b = c.baseline;
        newLog.push(this.addLog(c.id, "baseline", `Baseline set: SpO₂ ${b.spo2_mean.toFixed(1)} ± ${b.spo2_sd.toFixed(1)} %, HR ${b.hr_mean.toFixed(0)} bpm`));
      }
      this.levels[c.id] = c.level;
      return c;
    });
    this.history.push({ t: this.t, crew: crew.map((c) => ({ id: c.id, spo2: c.spo2_smooth, hr: c.hr, level: c.level })) });
    if (this.history.length > HISTORY_S) this.history.shift();
    const f = this.frame(crew);
    if (this.t >= this.data.length - 1) this.paused = true;
    else this.t += 1;
    return [f, newLog];
  }

  private frame(crew: CrewFrame[]): Msg {
    return { type: "frame", t: this.t, eva_start_s: this.th.baseline_s, speed: this.speed, paused: this.paused, scenario: this.scenario, length: this.data.length, crew };
  }

  private loop() {
    const [f, newLog] = this.tick();
    this.emit(f);
    newLog.forEach((entry) => this.emit({ type: "log", entry }));
    if (this.t % 5 === 0) this.save();
    this.timer = window.setTimeout(() => this.loop(), 1000 / this.speed);
  }

  // ---------- persistence: replay saved actions to rebuild detector state ----------
  private save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ scenario: this.scenario, speed: this.speed, paused: this.paused, t: this.t,
        actions: this.actions, sessions: this.sessions, log: this.log.slice(-500) }));
    } catch { /* storage unavailable: the demo still runs, it just won't resume */ }
  }

  private restore() {
    let saved: { scenario: string; speed: number; paused: boolean; t: number; actions: Action[]; sessions: Record<string, Session>; log: LogEntry[] } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) || "null");
    } catch { saved = null; }
    if (!saved || !this.data.config.scenarios[saved.scenario]) return this.reset("demo");
    this.build(saved.scenario);
    const pending = [...saved.actions].sort((a, b) => a.t - b.t);
    while (this.t < saved.t && !this.paused) {
      while (pending.length && pending[0].t <= this.t) this.apply(pending.shift()!, false);
      this.tick(true);
    }
    pending.forEach((a) => this.apply(a, false));
    this.actions = saved.actions;
    this.sessions = saved.sessions ?? {};
    this.log = saved.log ?? [];
    this.speed = saved.speed ?? 5;
    this.paused = !!saved.paused;
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
    if (path === "/api/sim") {
      if (typeof body.scenario === "string") {
        this.reset(body.scenario);
        this.emit({ type: "reset", log: this.log, sessions: this.sessions });
      }
      if (typeof body.speed === "number") {
        this.speed = Math.max(0.5, Math.min(body.speed, 50));
        clearTimeout(this.timer);
        this.loop();
      }
      if (typeof body.paused === "boolean") this.paused = body.paused;
      this.save();
      return { scenario: this.scenario, speed: this.speed, paused: this.paused };
    }
    if (path === "/api/ack") entry = this.apply({ t: this.t, kind: "ack", crew: String(body.crew) }, true);
    else if (path === "/api/treat") entry = this.apply({ t: this.t, kind: "treat", crew: String(body.crew) }, true);
    else if (path === "/api/resolve")
      entry = this.apply({ t: this.t, kind: "resolve", crew: String(body.crew), reason: String(body.reason), recover: body.recover !== false }, true);
    else if (path === "/api/log") entry = this.addLog(String(body.crew), String(body.kind), String(body.text), body.extra as Record<string, unknown>);
    if (entry) this.emit({ type: "log", entry });
    this.save();
    return entry ?? { ok: true };
  }

  async putSession(s: Session) {
    await this.ready;
    const key = `${s.protocol}:${s.crew}`;
    this.sessions[key] = { ...s, updated: Date.now() / 1000 };
    this.emit({ type: "session", key, session: this.sessions[key] });
    this.save();
  }

  async deleteSession(protocol: string, crew: string) {
    await this.ready;
    const key = `${protocol}:${crew}`;
    delete this.sessions[key];
    this.emit({ type: "session", key, session: null });
    this.save();
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
