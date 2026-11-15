import { createMonitoringState, monitoringReducer } from './monitoringState';

export const ASTRONAUT_IDS = Object.freeze(['EV1', 'EV2']);
export const trackedAstronaut = (pov) => (pov === 'EV1' ? 'EV2' : 'EV1');

export function createCrewState() {
  return { pov: 'EV1', astronauts: { EV1: createMonitoringState(), EV2: createMonitoringState() } };
}

export function crewReducer(state, action) {
  if (action.type === 'pov') {
    return ASTRONAUT_IDS.includes(action.id) ? { ...state, pov: action.id } : state;
  }
  if (action.type === 'tick') {
    return {
      ...state,
      astronauts: Object.fromEntries(
        ASTRONAUT_IDS.map((id) => [id, monitoringReducer(state.astronauts[id], action)]),
      ),
    };
  }
  if (action.type === 'astronaut' && ASTRONAUT_IDS.includes(action.id)) {
    return {
      ...state,
      astronauts: {
        ...state.astronauts,
        [action.id]: monitoringReducer(state.astronauts[action.id], {
          ...action.command,
          now: action.now,
        }),
      },
    };
  }
  return state;
}

// One central message: higher severity wins; own distress wins ties.
// In particular, no buddy notification can replace an own CRITICAL alert.
export function selectCentralAlert(ownSeverity, buddySeverity) {
  if (ownSeverity === 'CRITICAL') return { severity: ownSeverity, kind: 'own' };
  if (buddySeverity === 'CRITICAL') return { severity: buddySeverity, kind: 'buddy' };
  if (ownSeverity === 'WARNING') return { severity: ownSeverity, kind: 'own' };
  if (buddySeverity === 'WARNING') return { severity: buddySeverity, kind: 'buddy' };
  return { severity: 'NORMAL', kind: 'own' };
}
