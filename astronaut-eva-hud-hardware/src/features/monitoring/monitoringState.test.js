import { describe, expect, it } from 'vitest';
import {
  createMonitoringState,
  monitoringReducer as reduce,
  displayedSeverity,
  controlMode,
} from './monitoringState';

const tick = (state, now) => reduce(state, { type: 'tick', now });
const start = (id, now = 0, state = createMonitoringState()) =>
  reduce(state, { type: 'scenario', id, now });

describe('monitoring controller and scenario simulator', () => {
  it.each(['WARNING', 'CRITICAL'])(
    'latches the manual %s override separately from the engine',
    (severity) => {
      let state = reduce(createMonitoringState(), { type: 'override', severity, now: 0 });
      state = tick(state, 20000);
      expect(displayedSeverity(state)).toBe(severity);
      expect(state.engine.severity).toBe('NORMAL');
      expect(controlMode(state)).toBe('Manual Override');
      state = reduce(state, { type: 'telemetry', key: 'spo2', value: 98, now: 21000 });
      expect(displayedSeverity(tick(state, 30000))).toBe(severity);
      expect(start('baseline', 31000, state).override).toBeNull();
    },
  );
  it('reset restores defaults and clears all timers, scenarios and overrides', () => {
    let state = start('combined');
    for (let time = 100; time <= 9000; time += 100) state = tick(state, time);
    expect(displayedSeverity(state)).toBe('CRITICAL');
    state = reduce(state, { type: 'reset', now: 10000 });
    expect(displayedSeverity(state)).toBe('NORMAL');
    expect(state.telemetry).toEqual({ spo2: 98, heartRate: 72, respiration: 16, oxygen: 85 });
    expect(state.scenario).toBeNull();
    expect(state.override).toBeNull();
    expect(state.engine.breachSince).toBeNull();
    expect(state.engine.recoverySince).toBeNull();
  });
  it.each(['baseline', 'heart'])('scenario %s never alerts', (id) => {
    let state = start(id);
    for (let time = 100; time <= 12000; time += 100) {
      state = tick(state, time);
      expect(displayedSeverity(state)).toBe('NORMAL');
    }
    expect(state.telemetry.spo2).toBe(98);
    expect(state.telemetry.heartRate).toBe(id === 'heart' ? 120 : 72);
  });
  it.each(['spo2', 'combined'])(
    'scenario %s uses the same automatic 3/5-second progression',
    (id) => {
      let state = start(id);
      for (let time = 100; time <= 9000; time += 100) {
        state = tick(state, time);
        const since = state.engine.breachSince;
        expect(displayedSeverity(state)).toBe(
          since === null || time - since < 3000
            ? 'NORMAL'
            : time - since < 5000
              ? 'WARNING'
              : 'CRITICAL',
        );
      }
      expect(state.telemetry.spo2).toBe(92);
      expect(state.telemetry.heartRate).toBe(id === 'combined' ? 120 : 72);
      expect(displayedSeverity(state)).toBe('CRITICAL');
    },
  );
  it('switching scenarios discards the previous detection and simulation timeline', () => {
    let state = start('combined');
    state = tick(state, 4000);
    state = tick(state, 7000);
    expect(displayedSeverity(state)).toBe('WARNING');
    state = start('heart', 7000, state);
    state = tick(state, 8000);
    expect(state.telemetry).toEqual({ spo2: 98, heartRate: 72, respiration: 16, oxygen: 85 });
    state = tick(state, 20000);
    expect(displayedSeverity(state)).toBe('NORMAL');
    expect(state.telemetry.heartRate).toBe(120);
  });
  it('manual telemetry cancels a scenario and runs automatic detection and recovery', () => {
    let state = start('baseline');
    state = reduce(state, { type: 'telemetry', key: 'spo2', value: 92, now: 1000 });
    expect(state.scenario).toBeNull();
    expect(controlMode(state)).toBe('Automatic');
    expect(displayedSeverity(tick(state, 4000))).toBe('WARNING');
    state = tick(state, 6000);
    expect(displayedSeverity(state)).toBe('CRITICAL');
    state = reduce(state, { type: 'telemetry', key: 'spo2', value: 98, now: 6100 });
    expect(displayedSeverity(tick(state, 9100))).toBe('NORMAL');
  });
  it('stop holds current telemetry and leaves detection automatic', () => {
    let state = tick(start('combined'), 4000);
    state = reduce(state, { type: 'stop', now: 4100 });
    expect(state.scenario).toBeNull();
    const readings = state.telemetry;
    state = tick(state, 9100);
    expect(state.telemetry).toEqual(readings);
    expect(displayedSeverity(state)).toBe('CRITICAL');
  });
  it('rejects invalid live inputs and invalid baseline configuration', () => {
    const state = createMonitoringState();
    for (const value of [NaN, Infinity, -1, 101])
      expect(reduce(state, { type: 'telemetry', key: 'spo2', value })).toBe(state);
    expect(() =>
      reduce(state, { type: 'config', config: { ...state.config, spo2BaselineStdDev: 0 } }),
    ).toThrow();
  });
});

describe('live ESP32 sensor feed', () => {
  it('takes the sensor readings and keeps O₂ reserve', () => {
    const before = createMonitoringState();
    const state = reduce(before, {
      type: 'live',
      sample: { spo2: 91, heartRate: 88, respiration: 22 },
      now: 100,
    });
    expect(state.telemetry).toEqual({
      ...before.telemetry,
      spo2: 91,
      heartRate: 88,
      respiration: 22,
    });
    expect(state.telemetry.oxygen).toBe(before.telemetry.oxygen);
  });
  it('leaves a running scenario or override in control', () => {
    const running = reduce(createMonitoringState(), { type: 'scenario', id: 'baseline', now: 0 });
    expect(reduce(running, { type: 'live', sample: { spo2: 80 }, now: 100 })).toBe(running);
  });
});
