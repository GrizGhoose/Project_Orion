import { describe, expect, it } from 'vitest';
import {
  createBuddySimulation,
  INITIAL_BUDDY,
  BUDDY_LIMITS,
  formatBuddyDistance,
} from './buddySimulation';
import { buddyPlacement, rightVisorPointAtY, VISOR_SIDE_PATH } from '../visor/visorGeometry';

describe('buddy demo motion and shared visor geometry', () => {
  it('preserves the existing side outline exactly', () => {
    expect(VISOR_SIDE_PATH).toBe('M225 34 C94 122 36 297 39 520 C42 730 136 912 307 1040');
    expect(rightVisorPointAtY(520).x).toBeCloseTo(1881);
  });
  it('starts at mid-right and 38 metres', () => {
    const sample = createBuddySimulation({ now: 1000, random: () => 0.75 });
    expect(sample(1000)).toEqual(INITIAL_BUDDY);
    expect(formatBuddyDistance(38)).toBe('38 m');
    expect(formatBuddyDistance(38.14)).toBe('38.1 m');
  });
  it('keeps the full marker inside the curved boundary and clear of upper telemetry', () => {
    for (let y = BUDDY_LIMITS.minY; y <= BUDDY_LIMITS.maxY; y++) {
      const position = buddyPlacement(y);
      for (let offset = -32; offset <= 32; offset += 4) {
        expect(position.x + 12).toBeLessThanOrEqual(rightVisorPointAtY(y + offset).x - 28);
      }
      expect(position.y - 32).toBeGreaterThan(386);
      expect(position.x - 150).toBeGreaterThan(1460);
    }
    expect(buddyPlacement(810).x).toBeLessThan(buddyPlacement(560).x - 50);
  });
  it('stays bounded and smooth over repeated independent random targets', () => {
    let seed = 173;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const sample = createBuddySimulation({ random });
    let previous = sample(0);
    const yValues = [];
    const distances = [];
    for (let t = 100; t <= 1_200_000; t += 100) {
      const next = sample(t);
      expect(next.y).toBeGreaterThanOrEqual(BUDDY_LIMITS.minY);
      expect(next.y).toBeLessThanOrEqual(BUDDY_LIMITS.maxY);
      expect(next.distance).toBeGreaterThanOrEqual(30);
      expect(next.distance).toBeLessThanOrEqual(45);
      expect(Math.abs(next.y - previous.y)).toBeLessThan(2.01);
      expect(Math.abs(next.distance - previous.distance)).toBeLessThan(0.05);
      previous = next;
      yValues.push(next.y);
      distances.push(next.distance);
    }
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(200);
    expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(5);
  });
});
