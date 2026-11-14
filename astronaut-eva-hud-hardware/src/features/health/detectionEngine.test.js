import { describe, expect, it } from 'vitest';
import { advanceDetection, estimateSpo2Trend } from './detectionEngine';
import { SIMULATED_BASELINES } from './detectionConfig';
import { runSeries, sample } from '../../test/detectionFixtures';

const hypoxia = (result, id = 'EV1') =>
  result.alerts.find((a) => a.category === 'hypoxia' && a.astronautId === id);
const baseline = (values) => ({
  ...SIMULATED_BASELINES,
  EV1: { ...SIMULATED_BASELINES.EV1, ...values },
});
const constant = (spo2) => () => ({ EV1: { spo2 } });

describe('stateful SpO2 gate', () => {
  it('requires 30 continuous seconds for a 3-point individual baseline drop', () => {
    const before = runSeries({ end: 29, patch: constant(95) });
    expect(hypoxia(before)).toBeUndefined();
    const result = advanceDetection(
      before.state,
      sample(30, { EV1: { spo2: 95 } }),
      SIMULATED_BASELINES,
    );
    expect(hypoxia(result)).toMatchObject({ severity: 'warning', value: 95 });
    expect(result.assessments.EV1.spo2Delta).toBe(-3);
    expect(hypoxia(result).reason).toContain('30 s');
  });
  it.each([
    [93, false],
    [92.9, true],
  ])('absolute amber cutoff %s with no baseline', (spo2, active) => {
    const result = runSeries({ patch: constant(spo2), baselines: baseline({ spo2: null }) });
    expect(Boolean(hypoxia(result))).toBe(active);
  });
  it.each([
    [89, null],
    [94, 100],
  ])('requires 15 seconds for red: value %s baseline %s', (spo2, base) => {
    const baselines = baseline({ spo2: base });
    const before = runSeries({ end: 14, patch: constant(spo2), baselines });
    expect(hypoxia(before)).toBeUndefined();
    const result = advanceDetection(before.state, sample(15, { EV1: { spo2 } }), baselines);
    expect(hypoxia(result)?.severity).toBe('critical');
  });
  it.each([
    [84.9, 'critical'],
    [85, undefined],
  ])('immediate cutoff is strictly below 85: %s', (spo2, severity) => {
    expect(hypoxia(advanceDetection(null, sample(0, { EV1: { spo2 } })))?.severity).toBe(severity);
  });
  it.each([
    [1, undefined],
    [1.2, 'warning'],
    [2, 'warning'],
    [2.4, 'critical'],
  ])('regression decline %s pp/min escalates early', (speed, severity) => {
    const result = runSeries({ end: 20, patch: (t) => ({ EV1: { spo2: 98 - (speed * t) / 60 } }) });
    expect(hypoxia(result)?.severity).toBe(severity);
    expect(result.assessments.EV1.trend.samples).toBe(21);
  });
  it('does not infer a trend from two noisy readings', () => {
    expect(
      estimateSpo2Trend(
        [
          { time: 0, value: 99 },
          { time: 60000, value: 90 },
        ],
        60000,
      ),
    ).toBeNull();
  });
  it('restarts persistence after healthy interruptions and sample gaps', () => {
    let result = runSeries({ end: 20, patch: constant(95) });
    result = advanceDetection(result.state, sample(21), SIMULATED_BASELINES);
    result = runSeries({ start: 22, end: 50, state: result.state, patch: constant(95) });
    // A sharp transition can legitimately qualify a regression rule; inspect persistence separately.
    expect(result.assessments.EV1.amberDurationMs).toBe(28000);
    const gap = advanceDetection(null, sample(0, { EV1: { spo2: 95 } }), SIMULATED_BASELINES);
    const after = advanceDetection(
      gap.state,
      sample(31, { EV1: { spo2: 95 } }),
      SIMULATED_BASELINES,
    );
    expect(hypoxia(after)).toBeUndefined();
    expect(after.assessments.EV1.amberDurationMs).toBe(0);
  });
  it('does not count duplicate per-signal timestamps as new measurements', () => {
    let result = advanceDetection(null, sample(0, { EV1: { spo2: 95 } }), SIMULATED_BASELINES);
    for (let t = 1; t < 5; t++)
      result = advanceDetection(
        result.state,
        sample(t, { EV1: { spo2: 95, quality: { spo2: { receivedAt: 0 } } } }),
        SIMULATED_BASELINES,
      );
    expect(result.state.crew.EV1.samples).toHaveLength(1);
    expect(result.assessments.EV1.amberDurationMs).toBe(0);
  });
  it('retains critical severity during recovery and clears only after 10 healthy seconds', () => {
    let result = advanceDetection(null, sample(0, { EV1: { spo2: 84 } }), SIMULATED_BASELINES);
    result = runSeries({ start: 1, end: 10, state: result.state });
    expect(hypoxia(result)).toMatchObject({
      severity: 'critical',
      label: 'SpO₂ RECOVERY HOLD',
      value: 98,
    });
    result = advanceDetection(result.state, sample(11), SIMULATED_BASELINES);
    expect(hypoxia(result)).toBeUndefined();
    expect(result.events.some((e) => e.kind === 'cleared')).toBe(true);
  });
  it('does not let a lower-severity gate replace an active critical alert', () => {
    const critical = advanceDetection(null, sample(0, { EV1: { spo2: 84 } }), SIMULATED_BASELINES);
    const result = runSeries({ start: 1, end: 35, state: critical.state, patch: constant(95) });
    expect(hypoxia(result)?.severity).toBe('critical');
  });
  it('isolates astronaut baselines, state and alerts', () => {
    const result = runSeries({ patch: () => ({ EV1: { spo2: 95 }, EV2: { spo2: 95 } }) });
    expect(hypoxia(result, 'EV1')?.severity).toBe('warning');
    expect(hypoxia(result, 'EV2')).toBeUndefined();
    expect(result.assessments.EV2.spo2Delta).toBe(-2.5);
  });
  it('serializes checkpoints, rejects older frames and emits transitions only once', () => {
    const result = runSeries({ patch: constant(95) });
    expect(result.events.filter((e) => e.kind === 'raised')).toHaveLength(1);
    const next = advanceDetection(
      JSON.parse(JSON.stringify(result.state)),
      sample(31, { EV1: { spo2: 95 } }),
      SIMULATED_BASELINES,
    );
    expect(next.events).toEqual([]);
    expect(hypoxia(next)?.severity).toBe('warning');
    expect(advanceDetection(next.state, sample(2)).state).toBe(next.state);
  });
});

describe('supporting signals never independently open the hypoxia gate', () => {
  it.each([125, 155, 190])('HR %s with stable oxygen does not raise hypoxia', (heartRate) => {
    const result = runSeries({ patch: () => ({ EV1: { heartRate, expectedHeartRate: 160 } }) });
    expect(hypoxia(result)).toBeUndefined();
    expect(result.alerts).toEqual([]);
  });
  it('uses explicit workload HR and marks missing expectations unavailable', () => {
    const missing = runSeries({ patch: () => ({ EV1: { heartRate: 155 } }) });
    expect(missing.assessments.EV1.support[0].level).toBe('unavailable');
    for (const [heartRate, level] of [
      [169, 'none'],
      [170, 'warning-support'],
      [180, 'critical-support'],
    ]) {
      const result = runSeries({ patch: () => ({ EV1: { heartRate, expectedHeartRate: 160 } }) });
      expect(result.assessments.EV1.support[0].level).toBe(level);
      expect(hypoxia(result)).toBeUndefined();
    }
  });
  it('uses supplied HRV and breathing baselines as context only', () => {
    const result = runSeries({
      baselines: baseline({ hrvRmssdMs: 50 }),
      patch: () => ({ EV1: { hrvRmssdMs: 35, breathingRate: 21 } }),
    });
    expect(result.assessments.EV1.support.slice(1).map((s) => s.level)).toEqual([
      'warning-support',
      'warning-support',
    ]);
    expect(result.alerts).toEqual([]);
    expect(runSeries().assessments.EV1.support[2].level).toBe('unavailable');
  });
  it('escalates a sudden crossing below 50 only after a confirmed low-oxygen gate', () => {
    const low = runSeries({ patch: constant(95) });
    const result = advanceDetection(
      low.state,
      sample(31, { EV1: { spo2: 95, heartRate: 45 } }),
      SIMULATED_BASELINES,
    );
    expect(hypoxia(result)?.severity).toBe('critical');
    expect(
      hypoxia(advanceDetection(null, sample(0, { EV1: { heartRate: 45 } }), SIMULATED_BASELINES)),
    ).toBeUndefined();
  });
  it('implements slow/irregular breathing as an explicitly simulated combined rule', () => {
    const low = runSeries({ patch: constant(95) });
    const slow = runSeries({
      start: 31,
      end: 36,
      state: low.state,
      patch: () => ({ EV1: { spo2: 95, breathingRate: 7 } }),
    });
    expect(hypoxia(slow)?.reason).toContain('simulation-only');
    const irregular = sample(31, { EV1: { spo2: 95, breathingPattern: 'irregular' } });
    expect(hypoxia(advanceDetection(low.state, irregular, SIMULATED_BASELINES))?.severity).toBe(
      'critical',
    );
    irregular.simulated = false;
    expect(hypoxia(advanceDetection(low.state, irregular, SIMULATED_BASELINES))?.severity).toBe(
      'warning',
    );
  });
  it('does not infer cardiac rhythm detection from average BPM or unverified flags', () => {
    const result = advanceDetection(
      null,
      sample(0, { EV1: { heartRate: 200, rhythm: 'irregular' } }),
      SIMULATED_BASELINES,
    );
    expect(result.alerts).toEqual([]);
    expect(result.assessments.EV1.cardiac).toContain('unavailable');
  });
});

describe('quality and explicit suit messages', () => {
  it('rejects missing measurement timestamps and conflicting duplicate samples', () => {
    const missing = sample(0, { EV1: { spo2: 79, sampleTimeMs: undefined } });
    expect(advanceDetection(null, missing).alerts[0].category).toBe('data-quality');
    const initial = advanceDetection(null, sample(0), SIMULATED_BASELINES);
    const conflict = advanceDetection(
      initial.state,
      sample(1, { EV1: { spo2: 79, sampleTimeMs: 0 } }),
      SIMULATED_BASELINES,
    );
    expect(hypoxia(conflict)).toBeUndefined();
    expect(conflict.assessments.EV1.spo2Quality).toBe('invalid');
  });
  it('keeps explicit suit escalation until the fault clears, without duplicating events', () => {
    const fault = { code: 'oxygen-flow', active: true, verified: true };
    let result = runSeries({
      end: 20,
      patch: (t) => ({ EV1: { spo2: 98 - t * 0.01, suitFaults: [fault] } }),
    });
    result = runSeries({
      start: 21,
      end: 100,
      state: result.state,
      patch: () => ({ EV1: { spo2: 98, suitFaults: [fault] } }),
    });
    expect(result.alerts[0]).toMatchObject({ category: 'suit', severity: 'critical' });
    expect(result.events).toEqual([]);
    result = advanceDetection(result.state, sample(101), SIMULATED_BASELINES);
    expect(result.alerts).toEqual([]);
    expect(result.events[0].kind).toBe('cleared');
  });
  it.each([
    [null, 'unavailable'],
    [NaN, 'invalid'],
    [Infinity, 'invalid'],
    [-1, 'invalid'],
    [101, 'invalid'],
  ])('SpO2 %s is %s, never confirmed hypoxia', (spo2, quality) => {
    const result = advanceDetection(null, sample(0, { EV1: { spo2 } }), SIMULATED_BASELINES);
    expect(hypoxia(result)).toBeUndefined();
    expect(result.alerts).toContainEqual(
      expect.objectContaining({
        category: 'data-quality',
        reason: expect.stringContaining(quality),
      }),
    );
  });
  it.each(['disconnected', 'invalid', 'stale', 'unavailable'])(
    'explicit %s inhibits physiology and resets persistence',
    (status) => {
      const low = runSeries({ patch: constant(95) });
      const result = advanceDetection(
        low.state,
        sample(31, { EV1: { spo2: 79, quality: { spo2: { status } } } }),
        SIMULATED_BASELINES,
      );
      expect(hypoxia(result)).toBeUndefined();
      expect(result.events.some((e) => e.kind === 'suppressed')).toBe(true);
      expect(result.state.crew.EV1.amberSince).toBeNull();
    },
  );
  it('rejects stale and future sample times', () => {
    for (const receivedAt of [0, 11000]) {
      const result = advanceDetection(
        null,
        sample(10, { EV1: { spo2: 79, quality: { spo2: { receivedAt } } } }),
        SIMULATED_BASELINES,
      );
      expect(hypoxia(result)).toBeUndefined();
      expect(result.alerts[0].category).toBe('data-quality');
    }
  });
  it('requires a verified explicit suit fault; reserve/pressure values do not invent one', () => {
    const fault = {
      code: 'oxygen-flow',
      active: true,
      verified: true,
      message: 'Oxygen flow fault',
    };
    const result = advanceDetection(
      null,
      sample(0, { EV1: { suitFaults: [fault] } }),
      SIMULATED_BASELINES,
    );
    expect(result.alerts[0]).toMatchObject({ category: 'suit', severity: 'warning' });
    const noFault = advanceDetection(
      null,
      sample(0, { EV1: { oxygen: 1, pressure: 20, suitFaults: [{ ...fault, verified: false }] } }),
      SIMULATED_BASELINES,
    );
    expect(noFault.alerts).toEqual([]);
  });
  it('escalates a verified suit fault with an established declining trend independently of hypoxia', () => {
    const result = runSeries({
      end: 20,
      patch: (t) => ({
        EV1: {
          spo2: 98 - t * 0.01,
          suitFaults: [{ code: 'oxygen-pressure', active: true, verified: true }],
        },
      }),
    });
    expect(hypoxia(result)).toBeUndefined();
    expect(result.alerts[0]).toMatchObject({ category: 'suit', severity: 'critical' });
  });
});

describe('simulated reaction checks', () => {
  function start(baselines = SIMULATED_BASELINES) {
    return advanceDetection(null, sample(0), baselines, [
      { type: 'reaction-start', astronautId: 'EV1' },
    ]);
  }
  function answer(initial, responseMs, key = 'J', baselines = SIMULATED_BASELINES) {
    return advanceDetection(initial.state, sample(1), baselines, [
      {
        type: 'reaction-response',
        astronautId: 'EV1',
        reactionId: initial.state.crew.EV1.reaction.id,
        responseMs,
        key,
      },
    ]);
  }
  it.each([
    [624, 'J', undefined],
    [625, 'J', 'warning'],
    [1000, 'J', 'critical'],
    [300, 'K', 'critical'],
  ])('response %s key %s => %s', (ms, key, severity) => {
    const result = answer(start(), ms, key);
    expect(result.alerts.find((a) => a.category === 'cognitive')?.severity).toBe(severity);
    expect(hypoxia(result)).toBeUndefined();
  });
  it('records a missing baseline without inventing relative impairment', () => {
    const b = baseline({ reactionTimeMs: null });
    const result = answer(start(b), 2000, 'J', b);
    expect(result.alerts).toEqual([]);
    expect(result.state.crew.EV1.reaction.reason).toContain('unavailable');
  });
  it('logs one intended buddy escalation on timeout, enforces cooldown and acknowledges result', () => {
    const initial = start();
    const result = advanceDetection(initial.state, sample(11), SIMULATED_BASELINES);
    expect(result.events.filter((e) => e.kind === 'buddy-escalation-intent')).toHaveLength(1);
    expect(result.events.find((e) => e.kind === 'buddy-escalation-intent').text).toContain(
      'NOT TRANSMITTED',
    );
    const next = advanceDetection(result.state, sample(12), SIMULATED_BASELINES, [
      { type: 'reaction-start', astronautId: 'EV1' },
      { type: 'reaction-ack', astronautId: 'EV1' },
    ]);
    expect(next.state.crew.EV1.reaction.id).toBe(initial.state.crew.EV1.reaction.id);
    expect(next.alerts).toEqual([]);
    expect(next.events.filter((e) => e.kind === 'buddy-escalation-intent')).toHaveLength(0);
  });
  it('keeps simultaneous cognitive, suit and hypoxia alerts separate and prioritised', () => {
    const initial = start();
    const frame = sample(1, {
      EV1: { spo2: 84, suitFaults: [{ code: 'suit-pressure', active: true, verified: true }] },
    });
    const result = advanceDetection(initial.state, frame, SIMULATED_BASELINES, [
      {
        type: 'reaction-response',
        astronautId: 'EV1',
        reactionId: initial.state.crew.EV1.reaction.id,
        key: 'K',
        responseMs: 300,
      },
    ]);
    expect(new Set(result.alerts.map((a) => a.category))).toEqual(
      new Set(['cognitive', 'suit', 'hypoxia']),
    );
    expect(result.alerts.map((a) => a.severity)).toEqual(['critical', 'critical', 'warning']);
  });
});
