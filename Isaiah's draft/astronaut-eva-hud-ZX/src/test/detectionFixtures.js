import { generateFrame } from '../simulation/telemetrySimulator';
import { advanceDetection } from '../features/health/detectionEngine';
import { SIMULATED_BASELINES } from '../features/health/detectionConfig';

/** Test clock starts at zero; each fixture supplies fresh per-astronaut sample timestamps. */
export function sample(second, patches = {}) {
  const frame = generateFrame();
  frame.timestampMs = second * 1000;
  frame.elapsed = second;
  frame.astronauts = frame.astronauts.map((a) => ({
    ...a,
    sampleTimeMs: frame.timestampMs,
    spo2: 98,
    heartRate: 84,
    breathingRate: 17,
    ...patches[a.id],
  }));
  return frame;
}

export function runSeries({
  end = 30,
  start = 0,
  patch = () => ({}),
  baselines = SIMULATED_BASELINES,
  state = null,
} = {}) {
  let result;
  for (let second = start; second <= end; second++) {
    result = advanceDetection(state, sample(second, patch(second)), baselines);
    state = result.state;
  }
  return result;
}

export function assessedFrame(frame, previous = null, commands = []) {
  const result = advanceDetection(previous, frame, frame.baselines, commands);
  return {
    ...frame,
    alerts: result.alerts,
    assessments: result.assessments,
    detectionEvents: result.events,
    reactionChecks: Object.fromEntries(
      Object.entries(result.state.crew).map(([id, c]) => [id, c.reaction]),
    ),
  };
}
