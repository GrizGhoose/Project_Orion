import { describe, it, expect } from 'vitest';
import {
  createVisorGeometry,
  fitVisorScale,
  normaliseOptics,
  rectanglesOverlap,
} from './visorGeometry';
import { OPTICAL_DEFAULTS } from '../../../constants/opticalGeometry';
describe('visor angular geometry', () => {
  it('distinguishes viewing, optical and central fields without a physical display resolution', () => {
    const model = createVisorGeometry();
    expect(model.config).toEqual(OPTICAL_DEFAULTS);
    expect(model.optical.width / model.viewing.width).toBeCloseTo(40 / 70);
    expect(model.optical.height / model.viewing.height).toBeCloseTo(30 / 50);
    expect(model.clear.width / model.optical.width).toBeCloseTo(14 / 40);
  });
  it('anchors the timer and side indicators high in a stepped upper arc', () => {
    const { viewing, optical, zones } = createVisorGeometry();
    expect((optical.y + zones.mission.y) / viewing.height).toBeLessThan(0.16);
    expect(zones.physiology.y).toBeGreaterThan(zones.mission.y);
    expect(zones.oxygen.y).toBe(zones.physiology.y);
    expect(zones.mission.x + zones.mission.width / 2).toBeCloseTo(optical.width / 2);
  });
  it('keeps placement zones disjoint and outside the clear zone at all supported envelope extremes', () => {
    for (const topSafetyMarginDeg of [0.4, 0.8])
      for (const opticalHorizontalDeg of [36, 44])
        for (const opticalVerticalDeg of [27, 33])
          for (const clearHorizontalDeg of [10, 16])
            for (const clearVerticalDeg of [8, 12])
              for (const offsetHorizontalDeg of [-1.5, 1.5])
                for (const offsetVerticalDeg of [-1.5, 1.5]) {
                  const { optical, viewing, zones, clear } = createVisorGeometry({
                    topSafetyMarginDeg,
                    opticalHorizontalDeg,
                    opticalVerticalDeg,
                    clearHorizontalDeg,
                    clearVerticalDeg,
                    offsetHorizontalDeg,
                    offsetVerticalDeg,
                  });
                  const regions = Object.values(zones);
                  for (let index = 0; index < regions.length; index++) {
                    const rect = regions[index];
                    expect(rect.x).toBeGreaterThanOrEqual(0);
                    expect(rect.y).toBeGreaterThanOrEqual(0);
                    expect(rect.x + rect.width).toBeLessThanOrEqual(optical.width);
                    expect(rect.y + rect.height).toBeLessThanOrEqual(optical.height);
                    expect(rectanglesOverlap(rect, clear)).toBe(false);
                    for (const other of regions.slice(index + 1))
                      expect(rectanglesOverlap(rect, other)).toBe(false);
                    // Zone corners must also clear the rounded optical aperture, not just its rectangle.
                    for (const x of [rect.x, rect.x + rect.width])
                      for (const y of [rect.y, rect.y + rect.height]) {
                        const dx = Math.max(
                          optical.radius - x,
                          x - (optical.width - optical.radius),
                          0,
                        );
                        const dy = Math.max(
                          optical.radius - y,
                          y - (optical.height - optical.radius),
                          0,
                        );
                        expect(dx * dx + dy * dy).toBeLessThanOrEqual(
                          optical.radius * optical.radius + 0.001,
                        );
                      }
                  }
                  for (const x of [optical.x, optical.x + optical.width])
                    for (const y of [optical.y, optical.y + optical.height]) {
                      expect(
                        ((x - viewing.width / 2) / (viewing.width / 2)) ** 2 +
                          ((y - viewing.height / 2) / (viewing.height / 2)) ** 2,
                      ).toBeLessThanOrEqual(1);
                    }
                }
  });
  it.each([
    [320, 568],
    [390, 844],
    [1440, 900],
    [3440, 1440],
    [900, 1440],
    [800, 400],
  ])('fits the full viewing plane isotropically within %s × %s', (width, height) => {
    const { viewing, optical } = createVisorGeometry();
    const scale = fitVisorScale(width, height, viewing);
    expect(viewing.width * scale).toBeLessThanOrEqual(width - 32 + 0.001);
    expect(viewing.height * scale).toBeLessThanOrEqual(height - 32 + 0.001);
    expect((optical.width * scale) / (optical.height * scale)).toBeCloseTo(40 / 30);
  });
  it('clamps unsafe controls and rejects nonfinite values', () => {
    const config = normaliseOptics({
      opticalHorizontalDeg: 200,
      clearVerticalDeg: NaN,
      offsetVerticalDeg: -80,
    });
    expect(config.opticalHorizontalDeg).toBe(44);
    expect(config.clearVerticalDeg).toBe(10);
    expect(config.offsetVerticalDeg).toBe(-1.5);
    expect(fitVisorScale(NaN, 900, createVisorGeometry().viewing)).toBe(0);
  });
  it.each([
    [390, 844],
    [1440, 900],
    [3440, 1440],
    [900, 1440],
    [800, 400],
  ])(
    'fills the %sx%s scene while fitting upright optical content near the upper boundary',
    (width, height) => {
      const canonical = createVisorGeometry();
      const scale = fitVisorScale(width, height, canonical.viewing);
      for (const opticalHorizontalDeg of [36, 44])
        for (const opticalVerticalDeg of [27, 33]) {
          const { viewing, optical, zones, clear } = createVisorGeometry(
            { opticalHorizontalDeg, opticalVerticalDeg },
            { width, height },
          );
          expect(viewing.width * scale).toBeCloseTo(width);
          expect(viewing.height * scale).toBeCloseTo(height);
          expect((optical.y + zones.mission.y) * scale).toBeGreaterThanOrEqual(50 - 0.001);
          expect((optical.y + optical.height) * scale).toBeLessThan(height);
          expect((optical.x + optical.width / 2) * scale).toBeCloseTo(width / 2);
          for (const zone of Object.values(zones))
            expect(rectanglesOverlap(zone, clear)).toBe(false);
          for (const x of [optical.x, optical.x + optical.width])
            for (const y of [optical.y, optical.y + optical.height]) {
              expect(
                ((x - viewing.width / 2) / (viewing.width / 2)) ** 2 +
                  ((y - viewing.height / 2) / (viewing.height / 2)) ** 2,
              ).toBeLessThanOrEqual(1);
            }
        }
    },
  );
});
