// Demo-only relative bearing/distance source. No real position or sensor input.
export const BUDDY_STATES = Object.freeze(['NORMAL', 'WARNING', 'CRITICAL']);
export const BUDDY_LIMITS = Object.freeze({
  minY: 460,
  maxY: 810,
  minDistance: 30,
  maxDistance: 45,
});
export const INITIAL_BUDDY = Object.freeze({ y: 560, distance: 38 });

function reflected(value, min, max) {
  const span = max - min;
  const position = (((value - min) % (2 * span)) + 2 * span) % (2 * span);
  return min + (position <= span ? position : 2 * span - position);
}

function createLane(
  initial,
  min,
  max,
  minDuration,
  durationRange,
  minStep,
  stepRange,
  now,
  random,
) {
  function next(from, startedAt) {
    const sign = random() < 0.5 ? -1 : 1;
    return {
      from,
      to: reflected(from + sign * (minStep + random() * stepRange), min, max),
      startedAt,
      duration: minDuration + random() * durationRange,
    };
  }
  let segment = next(initial, now);
  return (timestamp) => {
    while (timestamp >= segment.startedAt + segment.duration) {
      segment = next(segment.to, segment.startedAt + segment.duration);
    }
    const t = Math.max(0, Math.min(1, (timestamp - segment.startedAt) / segment.duration));
    const eased = t * t * (3 - 2 * t);
    return segment.from + (segment.to - segment.from) * eased;
  };
}

export function createBuddySimulation({ now = 0, random = Math.random } = {}) {
  const vertical = createLane(INITIAL_BUDDY.y, 460, 810, 9000, 6000, 45, 75, now, random);
  const distance = createLane(INITIAL_BUDDY.distance, 30, 45, 11000, 7000, 0.8, 2.7, now, random);
  return (timestamp) => ({ y: vertical(timestamp), distance: distance(timestamp) });
}

export const formatBuddyDistance = (distance) => `${Number(distance.toFixed(1))} m`;
