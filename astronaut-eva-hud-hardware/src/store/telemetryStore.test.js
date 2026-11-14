import { describe, it, expect } from 'vitest';
import { createSnapshot, useTelemetryStore } from './telemetryStore';
import { assessedFrame, sample } from '../test/detectionFixtures';
describe('telemetry snapshot state', () => {
  it('bounds history, deduplicates events and replaces same-time samples', () => {
    const frame = assessedFrame(sample(0, { EV1: { spo2: 79 } }));
    let snapshot = createSnapshot(frame);
    snapshot = createSnapshot(frame, snapshot);
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.history).toHaveLength(1);
    for (let t = 1; t < 150; t++) snapshot = createSnapshot(assessedFrame(sample(t)), snapshot);
    expect(snapshot.history).toHaveLength(120);
  });
  it('replaces remote snapshots without duplicated history', () => {
    const snapshot = { ...createSnapshot(assessedFrame(sample(0))), paused: true };
    useTelemetryStore.getState().applySnapshot(snapshot);
    useTelemetryStore.getState().applySnapshot(snapshot);
    expect(useTelemetryStore.getState().history).toHaveLength(1);
    expect(useTelemetryStore.getState().paused).toBe(true);
  });
});
