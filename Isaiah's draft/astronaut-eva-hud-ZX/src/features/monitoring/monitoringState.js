import { createAlertState, evaluateAlert, AlertState } from './alertEngine';
import { DEFAULT_BASELINE, validateBaseline, spo2Threshold } from './baselineConfig';
import { defaultTelemetry, sampleScenario, SCENARIOS } from './scenarioSimulator';

export function createMonitoringState(config = DEFAULT_BASELINE) {
  validateBaseline(config);
  return {
    telemetry: defaultTelemetry(),
    config: { ...config },
    engine: createAlertState(),
    override: null,
    scenario: null,
    now: 0,
  };
}

export const displayedSeverity = (state) => state.override ?? state.engine.severity;
export const controlMode = (state) =>
  state.override ? 'Manual Override' : state.scenario ? 'Simulation' : 'Automatic';
export const TELEMETRY_LIMITS = Object.freeze({
  spo2: [0, 100],
  heartRate: [1, 250],
  respiration: [1, 80],
  oxygen: [0, 100],
});

export function monitoringReducer(state, action) {
  const now = Math.max(action.now ?? state.now, state.now);
  switch (action.type) {
    case 'tick': {
      const telemetry = state.scenario
        ? sampleScenario(state.scenario.id, now - state.scenario.startedAt)
        : state.telemetry;
      return {
        ...state,
        now,
        telemetry,
        engine: state.override
          ? state.engine
          : evaluateAlert(state.engine, telemetry, now, state.config),
      };
    }
    case 'reset':
      return { ...createMonitoringState(state.config), now };
    case 'override': {
      if (![AlertState.WARNING, AlertState.CRITICAL].includes(action.severity)) return state;
      // Explicit visual override, never an automatic engine transition.
      const telemetry = {
        ...defaultTelemetry(),
        spo2: Math.max(0, Math.min(92, spo2Threshold(state.config) - 1)),
      };
      return {
        ...state,
        now,
        telemetry,
        scenario: null,
        override: action.severity,
        engine: createAlertState(),
      };
    }
    case 'scenario':
      if (!SCENARIOS.some(({ id }) => id === action.id)) return state;
      return {
        ...createMonitoringState(state.config),
        now,
        scenario: { id: action.id, startedAt: now },
      };
    case 'stop':
      return { ...state, now, scenario: null };
    case 'telemetry': {
      const range = TELEMETRY_LIMITS[action.key];
      if (
        !range ||
        !Number.isFinite(action.value) ||
        action.value < range[0] ||
        action.value > range[1]
      )
        return state;
      const telemetry = { ...state.telemetry, [action.key]: action.value };
      return {
        ...state,
        now,
        telemetry,
        scenario: null,
        engine: state.override
          ? state.engine
          : evaluateAlert(state.engine, telemetry, now, state.config),
      };
    }
    case 'config': {
      validateBaseline(action.config);
      // Baseline changes start a fresh assessment with the current readings.
      const next = { ...state, now, config: { ...action.config }, scenario: null };
      return {
        ...next,
        engine: state.override
          ? createAlertState()
          : evaluateAlert(createAlertState(), state.telemetry, now, next.config),
      };
    }
    default:
      return state;
  }
}
