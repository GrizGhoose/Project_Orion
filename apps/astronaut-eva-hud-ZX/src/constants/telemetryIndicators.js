/** Display axes only, NOT normal/safe intervals or medical thresholds. */
export const INDICATOR_SCALES = Object.freeze({
  breathingRate: { label: 'Breathing rate', unit: 'breaths/min', min: 6, max: 40, decimals: 1 },
  heartRate: { label: 'Heart rate', unit: 'BPM', min: 40, max: 200, decimals: 0 },
  spo2: { label: 'SpO₂', unit: '%', min: 80, max: 100, decimals: 1 },
  oxygen: { label: 'Oxygen reserve', unit: '%', min: 0, max: 100, decimals: 0, fill: true },
});
