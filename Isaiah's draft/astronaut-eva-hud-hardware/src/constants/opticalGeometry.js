/** Angular schematic, NOT physical visor dimensions, pixel resolution or EMU visibility. */
export const OPTICAL_DEFAULTS = Object.freeze({
  viewingHorizontalDeg: 70,
  viewingVerticalDeg: 50,
  opticalHorizontalDeg: 40,
  opticalVerticalDeg: 30,
  clearHorizontalDeg: 14,
  clearVerticalDeg: 10,
  offsetHorizontalDeg: 0,
  offsetVerticalDeg: 0,
  topSafetyMarginDeg: 0.6,
});
// Tested layout envelope; changing it requires repeating containment/legibility checks.
export const OPTICAL_CONTROLS = [
  { key: 'opticalHorizontalDeg', label: 'Optical horizontal FOV', min: 36, max: 44, step: 1 },
  { key: 'opticalVerticalDeg', label: 'Optical vertical FOV', min: 27, max: 33, step: 1 },
  { key: 'clearHorizontalDeg', label: 'Central clear horizontal', min: 10, max: 16, step: 1 },
  { key: 'clearVerticalDeg', label: 'Central clear vertical', min: 8, max: 12, step: 1 },
  {
    key: 'offsetHorizontalDeg',
    label: 'Optical horizontal offset',
    min: -1.5,
    max: 1.5,
    step: 0.5,
  },
  { key: 'offsetVerticalDeg', label: 'Optical vertical offset', min: -1.5, max: 1.5, step: 0.5 },
  {
    key: 'topSafetyMarginDeg',
    label: 'Upper boundary safety margin',
    min: 0.4,
    max: 0.8,
    step: 0.1,
  },
];
export const VISOR_LAYOUT = Object.freeze({
  unitsPerDegree: 20, // arbitrary drawing units, not hardware pixels per degree
  canvasPadding: 16,
  topInsetPx: 50, // preferred CSS-pixel inset; ellipse clearance can increase this
  clearMinTopFraction: 0.45,
  clearMaxBottomFraction: 0.92,
  opticalCornerFraction: 0.08,
  // Fractions are optical-field local; browser dimensions never enter placement.
  zones: {
    physiology: { x: 0.035, y: 0, width: 0.28, height: 0.19 },
    mission: { x: 0.345, y: 0, width: 0.31, height: 0.205 },
    oxygen: { x: 0.685, y: 0, width: 0.28, height: 0.19 },
    provenance: { x: 0.25, y: 0.94, width: 0.5, height: 0.025 },
    context: { x: 0.035, y: 0.45, width: 0.2, height: 0.3 },
    buddy: { x: 0.765, y: 0.45, width: 0.2, height: 0.3 },
    alerts: { x: 0.05, y: 0.245, width: 0.9, height: 0.2 },
  },
});
