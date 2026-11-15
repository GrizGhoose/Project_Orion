import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSimulationProvider } from './simulationProvider';

class FakeChannel {
  static channels = new Set();
  constructor() {
    FakeChannel.channels.add(this);
  }
  postMessage(data) {
    for (const peer of FakeChannel.channels)
      if (peer !== this) peer.onmessage?.({ data: structuredClone(data) });
  }
  close() {
    FakeChannel.channels.delete(this);
  }
}
afterEach(() => {
  vi.useRealTimers();
  FakeChannel.channels.clear();
});
describe('cross-tab provider authority', () => {
  it('fast-forwards every second, preserves detector checkpoints on takeover and shares baselines', () => {
    vi.useFakeTimers();
    let first, second;
    const a = createSimulationProvider({ Channel: FakeChannel, id: 'a' });
    const b = createSimulationProvider({ Channel: FakeChannel, id: 'b' });
    a.start(
      (s) => {
        first = s;
      },
      () => {},
    );
    b.start(
      (s) => {
        second = s;
      },
      () => {},
    );
    b.command({ type: 'pause' });
    b.command({ type: 'baselines', astronautId: 'EV2', values: { spo2: 97, reactionTimeMs: 600 } });
    expect(first.frame.baselines.EV2.spo2).toBe(97);
    expect(first.frame.baselines.EV2.heartRate).toBeNull();
    b.command({ type: 'scenario', scenario: 'rapid' });
    b.command({ type: 'advance', seconds: 15 });
    expect(first.frame.alerts).toEqual([]);
    expect(second.detectorState.crew.EV1.samples).toHaveLength(16);
    a.stop();
    vi.advanceTimersByTime(4000);
    b.command({ type: 'advance', seconds: 5 });
    expect(second.frame.tick).toBe(20);
    expect(second.frame.alerts[0]).toMatchObject({ category: 'hypoxia', severity: 'critical' });
    expect(second.frame.baselines.EV2.spo2).toBe(97);
    b.stop();
  });
  it.each(['normal', 'heart', 'startle'])(
    '%s remains free of false hypoxia alarms for ten simulated minutes',
    (scenario) => {
      vi.useFakeTimers();
      let state;
      const provider = createSimulationProvider({ Channel: null });
      provider.start(
        (s) => {
          state = s;
        },
        () => {},
      );
      provider.command({ type: 'scenario', scenario });
      provider.command({ type: 'advance', seconds: 600 });
      expect(state.events.filter((e) => e.category === 'hypoxia')).toEqual([]);
      provider.stop();
    },
  );
  it('drives a failed reaction scenario and records timeout intent without a communications integration', () => {
    vi.useFakeTimers();
    let state;
    const provider = createSimulationProvider({ Channel: null });
    provider.start(
      (s) => {
        state = s;
      },
      () => {},
    );
    provider.command({ type: 'scenario', scenario: 'reaction' });
    provider.command({ type: 'advance', seconds: 2 });
    expect(state.frame.alerts[0]).toMatchObject({ category: 'cognitive', severity: 'critical' });
    provider.command({ type: 'scenario', scenario: 'normal' });
    provider.command({ type: 'reaction-start', astronautId: 'EV2' });
    provider.command({ type: 'advance', seconds: 11 });
    expect(state.events.filter((e) => e.kind === 'buddy-escalation-intent')).toHaveLength(1);
    expect(state.frame.reactionChecks.EV2.status).toBe('timeout');
    provider.stop();
  });
  it('elects one source, forwards commands without echo, and fails over', () => {
    vi.useFakeTimers();
    let first, second;
    const a = createSimulationProvider({ Channel: FakeChannel, id: 'a' });
    const b = createSimulationProvider({ Channel: FakeChannel, id: 'b' });
    a.start(
      (s) => {
        first = s;
      },
      () => {},
    );
    b.start(
      (s) => {
        second = s;
      },
      () => {},
    );
    vi.advanceTimersByTime(2500);
    expect(second.frame.tick).toBe(first.frame.tick);
    expect(first.frame.tick).toBe(2);
    b.command({ type: 'scenario', scenario: 'buddy' });
    expect(first.frame.scenario).toBe('buddy');
    expect(second).toEqual(first);
    expect(first.events.filter((e) => e.text === 'Scenario · buddy')).toHaveLength(1);
    b.command({ type: 'pause' });
    const elapsed = first.frame.elapsed;
    vi.advanceTimersByTime(2000);
    expect(second.frame.elapsed).toBe(elapsed);
    expect(second.paused).toBe(true);
    a.stop();
    vi.advanceTimersByTime(4000);
    b.command({ type: 'pause' });
    vi.advanceTimersByTime(1500);
    expect(second.frame.elapsed).toBeGreaterThan(elapsed);
    b.stop();
    expect(FakeChannel.channels.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('inherits the running session when a late joining lower ID wins election', () => {
    vi.useFakeTimers();
    let initial, joined;
    const source = createSimulationProvider({ Channel: FakeChannel, id: 'z' });
    source.start(
      (state) => {
        initial = state;
      },
      () => {},
    );
    source.command({ type: 'scenario', scenario: 'oxygen' });
    vi.advanceTimersByTime(5000);
    const joining = createSimulationProvider({ Channel: FakeChannel, id: 'a' });
    joining.start(
      (state) => {
        joined = state;
      },
      () => {},
    );
    expect(joined).toEqual(initial);
    vi.advanceTimersByTime(1500);
    expect(joined.frame.scenario).toBe('oxygen');
    expect(joined.frame.elapsed).toBeGreaterThan(8045);
    expect(joined).toEqual(initial);
    joining.stop();
    source.stop();
  });
  it('supports local fallback when the API is unavailable', () => {
    vi.useFakeTimers();
    let state;
    const source = createSimulationProvider({ Channel: null, id: 'a' });
    source.start(
      (s) => {
        state = s;
      },
      () => {},
    );
    source.command({ type: 'scenario', scenario: 'comms' });
    vi.advanceTimersByTime(1000);
    const replica = createSimulationProvider({ Channel: null, id: 'b' });
    const connection = vi.fn();
    replica.start(() => {}, connection);
    expect(connection).toHaveBeenCalledWith('standalone');
    expect(state.frame.alerts[0].parameter).toBe('communication');
    source.stop();
    replica.stop();
  });
});
