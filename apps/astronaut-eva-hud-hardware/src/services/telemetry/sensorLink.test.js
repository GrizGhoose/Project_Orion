import { describe, expect, it } from 'vitest';
import { sampleFromSensor } from './sensorLink';

describe('ESP32 sensor message mapping', () => {
  it('takes SpO₂ and heart rate, rounded', () => {
    expect(sampleFromSensor({ crew: 'EV1', spo2: 96.6, hr: 81.2, signal: true })).toEqual({
      spo2: 97,
      heartRate: 81,
    });
  });
  it('takes respiration only if the board sends it', () => {
    expect(sampleFromSensor({ spo2: 97, hr: 80, rr: 15.6, signal: true })).toEqual({
      spo2: 97,
      heartRate: 80,
      respiration: 16,
    });
  });
  it('ignores readings flagged as no finger / weak signal, and junk', () => {
    expect(sampleFromSensor({ spo2: 97, hr: 80, signal: false })).toBeNull();
    expect(sampleFromSensor({ spo2: null, hr: null, signal: true })).toBeNull();
    expect(sampleFromSensor('nope')).toBeNull();
  });
});
