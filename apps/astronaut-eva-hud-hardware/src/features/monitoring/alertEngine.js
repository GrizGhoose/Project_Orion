import { spo2Threshold, validateBaseline } from './baselineConfig';

export const AlertState = Object.freeze({
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
});

export function createAlertState() {
  return {
    severity: AlertState.NORMAL,
    breachSince: null,
    recoverySince: null,
    lastTimestamp: null,
  };
}

// Pure, timestamp-driven physiology engine. It knows nothing about scenarios,
// heart rate, React, or the separate developer visual override.
export function evaluateAlert(previous, telemetry, timestamp, config) {
  validateBaseline(config);
  if (!Number.isFinite(timestamp) || timestamp < 0)
    throw new RangeError('Invalid monotonic timestamp.');
  const now = Math.max(timestamp, previous.lastTimestamp ?? timestamp);
  const next = { ...previous, lastTimestamp: now };
  const value = telemetry.spo2;
  // Missing/invalid data proves neither a continuous breach nor recovery.
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ...next, breachSince: null, recoverySince: null };
  }
  if (value < spo2Threshold(config)) {
    next.recoverySince = null;
    next.breachSince ??= now;
    const elapsed = now - next.breachSince;
    if (elapsed >= config.criticalDurationMs) next.severity = AlertState.CRITICAL;
    else if (elapsed >= config.warningDurationMs && next.severity === AlertState.NORMAL)
      next.severity = AlertState.WARNING;
    return next;
  }
  next.breachSince = null;
  if (next.severity === AlertState.NORMAL) return { ...next, recoverySince: null };
  next.recoverySince ??= now;
  if (now - next.recoverySince >= config.recoveryDurationMs) {
    return { ...createAlertState(), lastTimestamp: now };
  }
  return next;
}
