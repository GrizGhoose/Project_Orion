import { MISSION } from '../constants/config';
import { SIMULATED_BASELINES } from '../features/health/detectionConfig';

/**
 * Pure telemetry fixture generator; all readings are simulated, not sensor/ECG measurements.
 * @param {object} options Scenario, seed and seconds elapsed since scenario start.
 * @returns {object} Raw timestamped telemetry; the source-owned detector adds assessments.
 * Optional astronaut fields: hrvRmssdMs, breathingPattern, expectedHeartRate, quality,
 * suitFaults [{code,active,verified,source,message}]. No rhythm detection is supplied.
 */
export function generateFrame({
  scenario = 'normal',
  tick = 0,
  seed = 42,
  elapsedBase = MISSION.initialElapsed,
  baselines = SIMULATED_BASELINES,
} = {}) {
  const wave = (offset) => Math.sin((tick + seed + offset) / 9);
  const elapsed = elapsedBase + tick,
    timestampMs = elapsed * 1000;
  const fault = (code, message) => ({
    code,
    message,
    active: true,
    verified: true,
    source: 'simulated',
  });
  const astronauts = ['EV1', 'EV2'].map((id, index) => ({
    id,
    name: index ? 'M. REYES' : 'A. MORGAN',
    role: index ? 'EVA specialist' : 'EVA lead',
    heartRate: Math.round(84 + index * 8 + wave(index * 5) * 3),
    breathingRate: +(17 + index + wave(index * 6) * 1.4).toFixed(1),
    // Keep normal variation below the proposed decline-rate gate, including its warmup window.
    spo2: +(98 - index * 0.5 + wave(index * 4) * 0.03).toFixed(2),
    hrvRmssdMs: null,
    temperature: 37.1,
    oxygen: +Math.max(0, 78 - index * 4 - tick * 0.008).toFixed(1),
    pressure: +(29.6 + wave(2) * 0.1).toFixed(1),
    co2: +(2.1 + index * 0.3 + wave(3) * 0.15).toFixed(1),
    communication: true,
    suitFaults: [],
    source: 'simulated',
    breathingSource: 'simulated',
    sampleTimeMs: timestampMs,
  }));
  const a = astronauts[0];
  if (scenario === 'heart') {
    a.heartRate = Math.round(160 + wave(5) * 3);
    a.expectedHeartRate = 160;
  }
  if (scenario === 'startle') a.heartRate = Math.round(84 + 60 * Math.exp(-tick / 12));
  if (scenario === 'gradual') a.spo2 = +Math.max(86, 98 - tick * 0.02).toFixed(2);
  if (scenario === 'rapid') a.spo2 = +Math.max(78, 98 - tick * 0.08).toFixed(2);
  if (scenario === 'buddy') astronauts[1].spo2 = +Math.max(78, 97.5 - tick * 0.2).toFixed(2);
  if (scenario === 'co2') {
    a.co2 = +(5.3 + Math.min(tick, 50) * 0.1).toFixed(1);
    a.suitFaults = [fault('co2-scrubber', 'Suit scrubber fault')];
  }
  if (scenario === 'oxygen') a.oxygen = +Math.max(8, 24 - tick * 0.4).toFixed(1);
  if (scenario === 'suit') a.suitFaults = [fault('oxygen-flow', 'Oxygen flow fault')];
  if (scenario === 'suit-decline') {
    a.suitFaults = [fault('oxygen-pressure', 'Oxygen supply pressure fault')];
    a.spo2 = +Math.max(84, 98 - tick * 0.025).toFixed(2);
  }
  if (scenario === 'disconnected') {
    a.spo2 = null;
    a.quality = { spo2: { status: 'disconnected', receivedAt: timestampMs } };
  }
  if (scenario === 'invalid') {
    a.spo2 = 105;
    a.quality = { spo2: { status: 'invalid', receivedAt: timestampMs } };
  }
  if (scenario === 'comms') astronauts[1].communication = false;
  return {
    scenario,
    tick,
    elapsed,
    timestampMs,
    remaining: Math.max(0, MISSION.duration - elapsed),
    astronauts,
    alerts: [],
    assessments: {},
    reactionChecks: {},
    baselines: structuredClone(baselines),
    simulated: true,
  };
}
