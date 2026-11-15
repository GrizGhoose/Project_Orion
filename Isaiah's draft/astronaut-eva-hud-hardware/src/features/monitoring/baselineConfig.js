// Illustrative prototype assumptions, not clinically validated thresholds.
export const DEFAULT_BASELINE = Object.freeze({
  spo2BaselineMean: 98,
  spo2BaselineStdDev: 1,
  heartRateBaselineMean: 72,
  heartRateBaselineStdDev: 10,
  heartRateElevatedSd: 3,
  warningDurationMs: 3000,
  criticalDurationMs: 5000,
  recoveryDurationMs: 3000,
});

export function validateBaseline(config) {
  if (!config || Object.keys(DEFAULT_BASELINE).some((key) => !Number.isFinite(config[key]))) {
    throw new RangeError('All baseline and timing settings must be finite numbers.');
  }
  const threshold = config.spo2BaselineMean - 3 * config.spo2BaselineStdDev;
  if (
    config.spo2BaselineMean <= 0 ||
    config.spo2BaselineMean > 100 ||
    config.spo2BaselineStdDev <= 0 ||
    threshold <= 0
  ) {
    throw new RangeError(
      'SpO₂ mean must be 0–100%, SD must be positive, and the derived threshold must exceed 0%.',
    );
  }
  if (
    config.heartRateBaselineMean <= 0 ||
    config.heartRateBaselineMean > 250 ||
    config.heartRateBaselineStdDev <= 0 ||
    config.heartRateElevatedSd <= 0 ||
    !Number.isFinite(
      config.heartRateBaselineMean + config.heartRateElevatedSd * config.heartRateBaselineStdDev,
    )
  ) {
    throw new RangeError('Heart-rate baseline, SD, and elevation multiplier must be positive.');
  }
  if (
    config.warningDurationMs <= 0 ||
    config.criticalDurationMs < config.warningDurationMs ||
    config.recoveryDurationMs <= 0
  ) {
    throw new RangeError('Durations must be positive; critical duration cannot precede warning.');
  }
  return config;
}

export const spo2Threshold = (config) => config.spo2BaselineMean - 3 * config.spo2BaselineStdDev;
export const heartRateThreshold = (config) =>
  config.heartRateBaselineMean + config.heartRateElevatedSd * config.heartRateBaselineStdDev;
export const isHeartRateElevated = (telemetry, config) =>
  telemetry.heartRate > heartRateThreshold(config);
