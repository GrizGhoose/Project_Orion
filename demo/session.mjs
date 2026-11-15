import { randomUUID } from 'node:crypto';
import { createMonitoringState, monitoringReducer } from '../apps/astronaut-eva-hud-ZX/src/features/monitoring/monitoringState.js';
import { DEFAULT_BASELINE } from '../apps/astronaut-eva-hud-ZX/src/features/monitoring/baselineConfig.js';

export const SCENARIO_START_MS = 15000;
export const SAMPLE_MS = 100; // Same cadence as the existing manual monitoring hook.
export const DEMO_BASELINE = DEFAULT_BASELINE;

export function completedResponse(proto, response) {
  const path = response?.path;
  if (!Array.isArray(path) || path[0] !== proto.start || proto.nodes[path.at(-1)]?.type !== 'end') return false;
  return path.every((id, index) => {
    const node = proto.nodes[id];
    if (!node) return false;
    if (index === path.length - 1) return true;
    const targets = [node.next, node.alt?.next, ...Object.values(node.next_if ?? {}),
      ...(node.options ?? []).map(option => option.next), ...Object.values(node.rules ?? {})];
    return targets.includes(path[index + 1]);
  });
}

// One server replays the unchanged manual Scenario 3 reducer on a monotonic timeline.
export class DemoSession {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.started = null;
  }
  initialize() {
    if (this.started === null) this.reset();
  }
  reset() {
    this.started = this.now();
    this.id = randomUUID();
    this.acked = false;
    this.sessions = {};
    this.log = [];
    this.ev1 = createMonitoringState();
    this.ev2 = createMonitoringState();
    this.nextSample = SCENARIO_START_MS;
    this.incident = {
      id: `${this.id}:EV1`, crew: 'EV1', status: 'NORMAL', triggered: false,
      resolvedAtMs: null, transitions: [{ status: 'NORMAL', elapsedMs: 0 }],
    };
  }
  transition(status, elapsedMs = Math.max(0, this.now() - this.started)) {
    this.incident.status = status;
    this.incident.transitions.push({ status, elapsedMs });
  }
  beginResponse(elapsedMs) {
    if (!['WARNING', 'CRITICAL'].includes(this.incident.status)) return false;
    this.transition('RESPONSE_IN_PROGRESS', elapsedMs);
    this.addLog('EV1', 'response', 'Emergency response in progress; physiological monitoring continues.');
    return true;
  }
  resolveIncident() {
    if (this.incident.status !== 'RESPONSE_IN_PROGRESS') return false;
    this.transition('RESOLVED');
    this.incident.resolvedAtMs = Math.max(0, this.now() - this.started);
    this.acked = false;
    this.addLog('EV1', 'resolve', 'Emergency response completed: EV1 incident resolved.');
    this.transition('NORMAL');
    this.ev1 = createMonitoringState();
    return true;
  }
  snapshot() {
    this.initialize();
    const elapsedMs = Math.max(0, this.now() - this.started);
    if (elapsedMs >= SCENARIO_START_MS && !this.incident.triggered) {
      this.incident.triggered = true;
      this.ev1 = monitoringReducer(this.ev1, { type: 'scenario', id: 'combined', now: SCENARIO_START_MS });
      this.addLog('EV1', 'sim', 'Scenario 3 started at 15 seconds; simulated physiology using the existing detector.', undefined, SCENARIO_START_MS);
    }
    if (this.incident.triggered && this.incident.resolvedAtMs === null) {
      const target = Math.floor(elapsedMs / SAMPLE_MS) * SAMPLE_MS;
      while (this.nextSample <= target) {
        // Once Critical is reached, Scenario 3 holds its readings. Jump over idle
        // samples after a long disconnect, while still evaluating the same reducer.
        if (this.ev1.engine.severity === 'CRITICAL') this.nextSample = target;
        const previous = this.ev1.engine.severity;
        this.ev1 = monitoringReducer(this.ev1, { type: 'tick', now: this.nextSample });
        const severity = this.ev1.engine.severity;
        if (severity !== previous) {
          this.acked = false;
          if (this.incident.status !== 'RESPONSE_IN_PROGRESS') this.transition(severity, this.nextSample);
          this.addLog('EV1', 'sim', `Scenario 3: ${previous} → ${severity}; simulated physiology, not sensor telemetry.`, { severity }, this.nextSample);
          if (this.sessions['hypoxia:EV1']) this.beginResponse(this.nextSample);
        }
        this.nextSample += SAMPLE_MS;
      }
    }
    const astronaut = state => ({ ...state.telemetry, severity: state.engine.severity,
      engine: { ...state.engine }, scenario: state.scenario ? { ...state.scenario } : null });
    return {
      type: 'demo', sessionId: this.id, elapsedMs, scenarioStartsAtMs: SCENARIO_START_MS,
      scenario: this.ev1.scenario?.id ?? null, baseline: DEFAULT_BASELINE,
      source: 'scripted-demo',
      incident: structuredClone(this.incident),
      astronauts: {
        EV1: astronaut(this.ev1),
        EV2: astronaut(this.ev2),
      },
    };
  }
  addLog(crew, kind, text, extra, elapsedMs = this.now() - this.started) {
    const entry = { utc: new Date().toISOString(), met_s: elapsedMs / 1000, crew, kind, text, extra };
    this.log.push(entry);
    this.log = this.log.slice(-500);
    return entry;
  }
}

export function tabletFrame(snapshot, crew, acked = false) {
  return {
    type: 'frame', t: Math.floor(snapshot.elapsedMs / 1000), speed: 1, paused: false,
    scenario: 'synchronized-demo', length: 86400, source: snapshot.source,
    sessionId: snapshot.sessionId,
    incident: snapshot.incident,
    crew: crew.map((c) => {
      const a = snapshot.astronauts[c.id];
      const baseline = snapshot.baseline;
      const breach = a.engine.breachSince === null ? 0 : Math.max(0, a.engine.lastTimestamp - a.engine.breachSince) / 1000;
      return {
        ...c, spo2: a.spo2, spo2_smooth: a.spo2, hr: a.heartRate, hr_delta: a.heartRate - baseline.heartRateBaselineMean,
        resp: a.respiration, hrv: null, suit_psia: 4.3, eq_alt_m: 0,
        level: a.severity === 'NORMAL' ? 'NOMINAL' : a.severity, signal: true,
        z: (a.spo2 - baseline.spo2BaselineMean) / baseline.spo2BaselineStdDev,
        hr_z: (a.heartRate - baseline.heartRateBaselineMean) / baseline.heartRateBaselineStdDev,
        baseline: { spo2_mean: baseline.spo2BaselineMean, spo2_sd: baseline.spo2BaselineStdDev, hr_mean: baseline.heartRateBaselineMean, hr_sd: baseline.heartRateBaselineStdDev },
        below_caution_s: breach, below_warning_s: breach, slope_per_min: 0, startle: false,
        reasons: [`${a.severity === 'CRITICAL' ? 'STOP EVA ACTIVITY · ' : ''}Scenario 3 · simulated physiology, existing SpO₂ duration detector.`],
        calibration_left_s: 0, reaction: null, acked: c.id === 'EV1' && acked,
        phase: 'EVA', treated: false,
      };
    }),
  };
}
