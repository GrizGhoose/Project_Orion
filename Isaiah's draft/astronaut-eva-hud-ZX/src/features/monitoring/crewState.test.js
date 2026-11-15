import { describe, expect, it } from 'vitest';
import { createCrewState, crewReducer, trackedAstronaut, selectCentralAlert } from './crewState';
import { displayedSeverity } from './monitoringState';

const send = (state, id, command, now = 0) =>
  crewReducer(state, { type: 'astronaut', id, command, now });
const view = (state, id) => crewReducer(state, { type: 'pov', id });
const tick = (state, now) => crewReducer(state, { type: 'tick', now });

describe('independent EV1/EV2 monitoring', () => {
  it('defaults to EV1 tracking EV2 with separate monitoring objects', () => {
    const state = createCrewState();
    expect(state.pov).toBe('EV1');
    expect(trackedAstronaut(state.pov)).toBe('EV2');
    expect(state.astronauts.EV1).not.toBe(state.astronauts.EV2);
    expect(state.astronauts.EV1.engine).not.toBe(state.astronauts.EV2.engine);
  });
  it('preserves overrides, telemetry and timers while switching POV', () => {
    let state = send(createCrewState(), 'EV2', { type: 'override', severity: 'WARNING' });
    const ev1 = state.astronauts.EV1;
    const ev2 = state.astronauts.EV2;
    state = view(state, 'EV2');
    expect(trackedAstronaut(state.pov)).toBe('EV1');
    state = view(state, 'EV1');
    expect(state.astronauts.EV1).toBe(ev1);
    expect(state.astronauts.EV2).toBe(ev2);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('WARNING');
    state = send(state, 'EV1', { type: 'override', severity: 'CRITICAL' });
    expect(displayedSeverity(state.astronauts.EV2)).toBe('WARNING');
    state = send(state, 'EV2', { type: 'reset' });
    expect(displayedSeverity(state.astronauts.EV1)).toBe('CRITICAL');
    expect(displayedSeverity(state.astronauts.EV2)).toBe('NORMAL');
  });
  it('evaluates both astronauts off-screen with independent breach/recovery clocks', () => {
    let state = send(createCrewState(), 'EV2', { type: 'telemetry', key: 'spo2', value: 92 });
    state = send(state, 'EV1', { type: 'telemetry', key: 'heartRate', value: 120 });
    state = tick(state, 3000);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('WARNING');
    expect(displayedSeverity(state.astronauts.EV1)).toBe('NORMAL');
    state = view(state, 'EV2');
    state = tick(state, 5000);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('CRITICAL');
    state = send(state, 'EV2', { type: 'telemetry', key: 'spo2', value: 98 }, 5100);
    state = view(state, 'EV1');
    state = tick(state, 8100);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('NORMAL');
    expect(state.astronauts.EV1.telemetry.heartRate).toBe(120);
  });
  it('keeps separate scenario timelines alive across POV switches', () => {
    let state = send(createCrewState(), 'EV2', { type: 'scenario', id: 'combined' });
    state = tick(state, 4000);
    state = view(state, 'EV2');
    state = send(state, 'EV1', { type: 'scenario', id: 'heart' }, 4000);
    state = tick(state, 7000);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('WARNING');
    state = view(state, 'EV1');
    state = tick(state, 9000);
    expect(displayedSeverity(state.astronauts.EV2)).toBe('CRITICAL');
    expect(displayedSeverity(state.astronauts.EV1)).toBe('NORMAL');
    expect(state.astronauts.EV1.telemetry.heartRate).toBe(120);
  });
  it('rejects invalid astronaut targets without changing either state', () => {
    const state = createCrewState();
    expect(view(state, 'EV3')).toBe(state);
    expect(send(state, 'EV3', { type: 'reset' })).toBe(state);
  });
});

describe('central own/buddy alert priority', () => {
  it.each([
    ['NORMAL', 'NORMAL', 'NORMAL', 'own'],
    ['NORMAL', 'WARNING', 'WARNING', 'buddy'],
    ['NORMAL', 'CRITICAL', 'CRITICAL', 'buddy'],
    ['WARNING', 'NORMAL', 'WARNING', 'own'],
    ['WARNING', 'WARNING', 'WARNING', 'own'],
    ['WARNING', 'CRITICAL', 'CRITICAL', 'buddy'],
    ['CRITICAL', 'NORMAL', 'CRITICAL', 'own'],
    ['CRITICAL', 'WARNING', 'CRITICAL', 'own'],
    ['CRITICAL', 'CRITICAL', 'CRITICAL', 'own'],
  ])('own %s / buddy %s selects %s from %s', (own, buddy, severity, kind) => {
    expect(selectCentralAlert(own, buddy)).toEqual({ severity, kind });
  });
});
