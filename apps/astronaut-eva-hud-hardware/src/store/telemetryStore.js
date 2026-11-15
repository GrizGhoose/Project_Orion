import { create } from 'zustand';
import { generateFrame } from '../simulation/telemetrySimulator';
export const useTelemetryStore = create((set) => ({
  frame: generateFrame(),
  history: [],
  events: [],
  paused: false,
  connection: 'starting',
  receivedAt: Date.now(),
  applySnapshot: (snapshot) =>
    set({
      frame: snapshot.frame,
      history: snapshot.history,
      events: snapshot.events,
      paused: snapshot.paused ?? false,
      receivedAt: Date.now(),
    }),
  setConnection: (connection) => set({ connection }),
}));
/** Source snapshots include already-classified, deduplicated domain transitions. */
export function createSnapshot(frame, previous = { history: [], events: [] }) {
  const sample = {
    tick: frame.elapsed,
    timestampMs: frame.timestampMs,
    ...Object.fromEntries(
      frame.astronauts.flatMap((a) => [
        [`${a.id}Hr`, a.heartRate],
        [`${a.id}Spo2`, a.spo2],
        [`${a.id}Co2`, a.co2],
        [`${a.id}Breathing`, a.breathingRate],
      ]),
    ),
  };
  const earlier =
    previous.history.at(-1)?.timestampMs === frame.timestampMs
      ? previous.history.slice(0, -1)
      : previous.history;
  const seen = new Set(previous.events.map((e) => e.id));
  const fresh = (frame.detectionEvents || []).filter((e) => !seen.has(e.id));
  return {
    frame,
    history: [...earlier, sample].slice(-120),
    events: [...fresh.reverse(), ...previous.events].slice(0, 40),
  };
}
