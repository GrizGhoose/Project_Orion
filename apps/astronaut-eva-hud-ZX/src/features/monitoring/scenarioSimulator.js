import { TELEMETRY } from '../visor/config.js';

export const defaultTelemetry = () =>
  Object.fromEntries(Object.entries(TELEMETRY).map(([key, metric]) => [key, metric.value]));
export const SCENARIOS = Object.freeze([
  { id: 'baseline', label: 'Scenario 1 — Normal Baseline' },
  { id: 'spo2', label: 'Scenario 2 — SpO₂ Deterioration' },
  { id: 'combined', label: 'Scenario 3 — SpO₂ Deterioration + Elevated Heart Rate' },
  { id: 'heart', label: 'Scenario 4 — Elevated Heart Rate Only' },
]);

// Two seconds of baseline, then a two-second ramp, then hold. No timers here:
// one monitoring subscription owns all simulation and detection updates.
export function sampleScenario(id, elapsedMs) {
  const sample = defaultTelemetry();
  const progress = Math.min(1, Math.max(0, (elapsedMs - 2000) / 2000));
  if (id === 'spo2' || id === 'combined') sample.spo2 = Math.round((98 - 6 * progress) * 10) / 10;
  if (id === 'heart' || id === 'combined') sample.heartRate = Math.round(72 + 48 * progress);
  return sample;
}
