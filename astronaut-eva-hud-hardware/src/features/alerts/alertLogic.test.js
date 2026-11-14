import { describe, it, expect } from 'vitest';
import { statusFor } from './alertLogic';
import { generateFrame } from '../../simulation/telemetrySimulator';
describe('alert presentation', () => {
  it('is deterministic and leaves evaluation to the stateful engine', () => {
    expect(generateFrame({ seed: 4, tick: 10 })).toEqual(generateFrame({ seed: 4, tick: 10 }));
    expect(generateFrame({ scenario: 'heart' }).alerts).toEqual([]);
  });
  it('distinguishes crew and parameter severity', () => {
    const alerts = [
      { astronautId: 'EV1', parameter: 'spo2', severity: 'critical' },
      { astronautId: 'EV1', parameter: 'suitFault', severity: 'warning' },
    ];
    expect(statusFor(alerts, 'EV1')).toBe('critical');
    expect(statusFor(alerts, 'EV1', ['suitFault'])).toBe('warning');
    expect(statusFor(alerts, 'EV2')).toBe('normal');
  });
});
