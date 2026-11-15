import { describe, expect, it } from 'vitest';
import { createAlertState, evaluateAlert } from './alertEngine';
import { DEFAULT_BASELINE, validateBaseline, isHeartRateElevated } from './baselineConfig';

const config = DEFAULT_BASELINE;
const step = (previous, time, spo2 = 92, heartRate = 72) =>
  evaluateAlert(previous, { spo2, heartRate }, time, config);

describe('SpO₂-gated monitoring engine', () => {
  it.each([72, 120])('keeps normal saturation NORMAL at HR %s', (hr) => {
    let state = step(createAlertState(), 0, 98, hr);
    state = step(state, 10000, 98, hr);
    expect(state.severity).toBe('NORMAL');
    expect(state.breachSince).toBeNull();
  });
  it.each([72, 120])('uses the same 3/5-second boundaries at HR %s', (hr) => {
    let state = step(createAlertState(), 100, 92, hr);
    for (const [time, expected] of [
      [2100, 'NORMAL'],
      [3099, 'NORMAL'],
      [3100, 'WARNING'],
      [5099, 'WARNING'],
      [5100, 'CRITICAL'],
    ]) {
      state = step(state, time, 92, hr);
      expect(state.severity).toBe(expected);
    }
  });
  it('cancels a pending breach immediately and restarts its original timestamp', () => {
    let state = step(createAlertState(), 0);
    state = step(state, 2900, 95);
    expect(state.breachSince).toBeNull();
    state = step(state, 3000);
    state = step(state, 5999);
    expect(state.severity).toBe('NORMAL');
    expect(step(state, 6000).severity).toBe('WARNING');
  });
  it.each([3000, 5000])(
    'clears an active alert after 3 continuous recovery seconds (%s ms breach)',
    (breach) => {
      let state = step(step(createAlertState(), 0), breach);
      const severity = state.severity;
      state = step(state, breach + 100, 98);
      state = step(state, breach + 3099, 98);
      expect(state.severity).toBe(severity);
      state = step(state, breach + 3100, 98);
      expect(state.severity).toBe('NORMAL');
      expect(state.breachSince).toBeNull();
      expect(state.recoverySince).toBeNull();
    },
  );
  it.each([3000, 5000])(
    'holds the existing alert when recovery is interrupted (%s ms breach)',
    (breach) => {
      let state = step(step(createAlertState(), 0), breach);
      const severity = state.severity;
      state = step(state, breach + 100, 98);
      state = step(state, breach + 2900);
      expect(state.severity).toBe(severity);
      expect(state.recoverySince).toBeNull();
      expect(state.breachSince).toBe(breach + 2900);
      // A WARNING now needs a fresh continuous 5-second breach to escalate.
      state = step(state, breach + 7800);
      expect(state.severity).toBe(severity);
      expect(step(state, breach + 7900).severity).toBe('CRITICAL');
    },
  );
  it('does not escalate during normal recovery even after the original 5-second boundary', () => {
    let state = step(step(createAlertState(), 0), 3000);
    state = step(state, 3100, 98);
    expect(step(state, 5100, 98).severity).toBe('WARNING');
  });
  it('uses timestamps after delayed updates, rather than tick counts', () => {
    const state = step(createAlertState(), 40);
    expect(step(state, 6040).severity).toBe('CRITICAL');
  });
  it('treats exact threshold equality as normal', () => {
    expect(step(createAlertState(), 0, 95).breachSince).toBeNull();
  });
  it('uses configurable individual baselines and recovery duration', () => {
    const custom = {
      ...config,
      spo2BaselineMean: 97,
      spo2BaselineStdDev: 2,
      recoveryDurationMs: 4000,
    };
    expect(evaluateAlert(createAlertState(), { spo2: 92 }, 0, custom).breachSince).toBeNull();
    let state = evaluateAlert(createAlertState(), { spo2: 90 }, 0, custom);
    state = evaluateAlert(state, { spo2: 90 }, 5000, custom);
    state = evaluateAlert(state, { spo2: 97 }, 6000, custom);
    expect(evaluateAlert(state, { spo2: 97 }, 9999, custom).severity).toBe('CRITICAL');
    expect(evaluateAlert(state, { spo2: 97 }, 10000, custom).severity).toBe('NORMAL');
    expect(isHeartRateElevated({ heartRate: 120 }, config)).toBe(true);
    expect(isHeartRateElevated({ heartRate: 120 }, { ...config, heartRateBaselineMean: 95 })).toBe(
      false,
    );
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid SpO₂ baseline SD %s', (value) => {
    expect(() => validateBaseline({ ...config, spo2BaselineStdDev: value })).toThrow(RangeError);
  });
  it.each([
    { spo2BaselineMean: 101 },
    { spo2BaselineMean: 0 },
    { spo2BaselineStdDev: 100 },
    { heartRateBaselineStdDev: 0 },
    { heartRateBaselineMean: NaN },
    { heartRateElevatedSd: -1 },
    { recoveryDurationMs: 0 },
    { criticalDurationMs: 2000 },
  ])('rejects invalid baseline/timing patch %j', (patch) => {
    expect(() => validateBaseline({ ...config, ...patch })).toThrow(RangeError);
  });
  it('holds active severity on invalid telemetry without counting it as recovery', () => {
    let state = step(step(createAlertState(), 0), 5000);
    state = step(state, 6000, NaN);
    expect(state.severity).toBe('CRITICAL');
    expect(state.recoverySince).toBeNull();
    expect(step(state, 10000, 98).severity).toBe('CRITICAL');
  });
});
