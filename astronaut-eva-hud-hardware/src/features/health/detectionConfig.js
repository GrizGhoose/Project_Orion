/** Experimental demonstration policy. Not NASA-approved or medically validated. */
export const DETECTION_RULES = Object.freeze({
  warningSpo2: 93,
  warningDrop: 3,
  warningMs: 30000,
  criticalSpo2: 90,
  criticalDrop: 6,
  criticalMs: 15000,
  immediateSpo2: 85,
  trendWindowMs: 60000,
  trendMinSpanMs: 20000,
  trendMinSamples: 8,
  warningFallPerMinute: 1,
  criticalFallPerMinute: 2,
  maxSampleGapMs: 5000,
  recoveryMs: 10000,
  hrWarningAboveExpected: 10,
  hrCriticalAboveExpected: 20,
  suddenLowHr: 50,
  hrvWarningDropFraction: 0.3,
  breathingWarningAboveBaseline: 4,
  // Simulation-only combined rule. NOT an established clinical breathing threshold.
  simulatedSlowBreathing: 8,
  simulatedSlowBreathingMs: 5000,
  reactionDelayMs: 1000,
  stimulusMs: 1000,
  reactionTimeoutMs: 10000,
  reactionCooldownMs: 60000,
  reactionWarningRatio: 1.25,
  reactionCriticalRatio: 2,
  hypoxiaAction: 'Pause activity. Notify crew and verify readings.',
  suitAction: 'Pause activity. Notify crew and verify the suit fault.',
  reactionAction: 'Notify crew. Review the simulated reaction-check result.',
});

export const ALERT_CATEGORIES = Object.freeze({
  hypoxia: 'Hypoxia-related',
  suit: 'Suit safety',
  cognitive: 'Cognitive performance',
  cardiac: 'Cardiac safety',
  'data-quality': 'Data quality',
  operational: 'Communications',
});

export const BASELINE_FIELDS = [
  { key: 'spo2', label: 'Baseline SpO₂ (%)', min: 0, max: 100, step: 0.1 },
  { key: 'heartRate', label: 'Baseline heart rate (BPM)', min: 1, max: 300, step: 1 },
  { key: 'breathingRate', label: 'Baseline breathing (breaths/min)', min: 0, max: 100, step: 0.1 },
  { key: 'hrvRmssdMs', label: 'Baseline HRV RMSSD (ms)', min: 1, max: 500, step: 1 },
  { key: 'reactionTimeMs', label: 'Baseline reaction time (ms)', min: 1, max: 10000, step: 1 },
  {
    key: 'expectedHeartRate',
    label: 'Expected HR for current work (BPM)',
    min: 1,
    max: 300,
    step: 1,
  },
];

/** Explicit demo fixtures, never substituted for missing real pre-EVA measurements. */
export const SIMULATED_BASELINES = Object.freeze({
  EV1: {
    source: 'simulated-pre-eva',
    revision: 0,
    spo2: 98,
    heartRate: 84,
    breathingRate: 17,
    hrvRmssdMs: null,
    reactionTimeMs: 500,
    expectedHeartRate: null,
  },
  EV2: {
    source: 'simulated-pre-eva',
    revision: 0,
    spo2: 97.5,
    heartRate: 92,
    breathingRate: 18,
    hrvRmssdMs: null,
    reactionTimeMs: 560,
    expectedHeartRate: null,
  },
});

export function normaliseBaseline(values, revision = 0) {
  return {
    source: 'simulated-pre-eva',
    revision,
    ...Object.fromEntries(
      BASELINE_FIELDS.map(({ key, min, max }) => [
        key,
        Number.isFinite(values[key]) && values[key] >= min && values[key] <= max
          ? values[key]
          : null,
      ]),
    ),
  };
}
