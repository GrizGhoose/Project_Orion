// Visual-only simulated readings, independent of the previous simulation system.
export const TELEMETRY = Object.freeze({
  respiration: { label: 'RESPIRATION', value: 16, unit: 'breaths/min' },
  heartRate: { label: 'HEART RATE', value: 72, unit: 'BPM' },
  spo2: { label: 'SpO₂', value: 98, unit: '%' },
  oxygen: { label: 'O₂ RESERVE', value: 85, unit: '%' },
});

export function formatElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}
