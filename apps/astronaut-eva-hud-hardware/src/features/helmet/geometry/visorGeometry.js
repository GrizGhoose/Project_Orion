import {
  OPTICAL_DEFAULTS,
  OPTICAL_CONTROLS,
  VISOR_LAYOUT,
} from '../../../constants/opticalGeometry';
export function normaliseOptics(overrides = {}) {
  const config = { ...OPTICAL_DEFAULTS };
  for (const { key, min, max } of OPTICAL_CONTROLS) {
    const value = overrides[key];
    if (Number.isFinite(value)) config[key] = Math.max(min, Math.min(max, value));
  }
  return config;
}
/** Flat upper rim, rounded temples and a curved lower bowl; a schematic, not physical optics. */
export function visorOutlinePath(width, height) {
  return `M ${width * 0.14} 0 H ${width * 0.86}
    C ${width * 0.95} 0 ${width} ${height * 0.08} ${width} ${height * 0.2}
    L ${width} ${height * 0.55}
    C ${width} ${height * 0.8} ${width * 0.8} ${height} ${width * 0.5} ${height}
    C ${width * 0.2} ${height} 0 ${height * 0.8} 0 ${height * 0.55}
    L 0 ${height * 0.2}
    C 0 ${height * 0.08} ${width * 0.05} 0 ${width * 0.14} 0 Z`;
}
/** Orthographic angular layout proxy. Rounded boundaries are schematic curvature only. */
export function createVisorGeometry(overrides, viewport) {
  const config = normaliseOptics(overrides);
  const unit = VISOR_LAYOUT.unitsPerDegree;
  const viewing = {
    x: 0,
    y: 0,
    width: config.viewingHorizontalDeg * unit,
    height: config.viewingVerticalDeg * unit,
  };
  const scale = viewport ? fitVisorScale(viewport.width, viewport.height, viewing) : 1;
  if (viewport && scale <= 0) return createVisorGeometry(overrides);
  if (viewport && scale > 0) {
    // The viewing mask fills the canvas; optical units and text retain isotropic scale.
    viewing.width = viewport.width / scale;
    viewing.height = viewport.height / scale;
  }
  const optical = {
    width: config.opticalHorizontalDeg * unit,
    height: config.opticalVerticalDeg * unit,
  };
  optical.x = (viewing.width - optical.width) / 2 + config.offsetHorizontalDeg * unit;
  // Highest complete rectangular optical aperture that clears the viewing ellipse.
  // Reserve vertical-offset travel so positive offsets can move upward without clipping.
  const outerX = optical.width / 2 + Math.abs(config.offsetHorizontalDeg * unit);
  const ellipseTop =
    (viewing.height / 2) * (1 - Math.sqrt(1 - (outerX / (viewing.width / 2)) ** 2));
  const inset = config.topSafetyMarginDeg * unit;
  const preferredTop = viewport
    ? VISOR_LAYOUT.topInsetPx / scale - inset
    : ellipseTop + inset + 1.5 * unit;
  optical.y = Math.max(ellipseTop + inset, preferredTop - config.offsetVerticalDeg * unit);
  optical.radius = Math.min(optical.width, optical.height) * VISOR_LAYOUT.opticalCornerFraction;
  const clear = {
    x: (optical.width - config.clearHorizontalDeg * unit) / 2,
    y: (optical.height - config.clearVerticalDeg * unit) / 2,
    width: config.clearHorizontalDeg * unit,
    height: config.clearVerticalDeg * unit,
  };
  // Follow the actual canvas centre where possible, below the upper alert strip.
  // On tall canvases the visual centre is already outside the optical aperture.
  clear.y = Math.max(
    optical.height * VISOR_LAYOUT.clearMinTopFraction,
    Math.min(
      viewing.height / 2 - optical.y - clear.height / 2,
      Math.min(optical.height - inset, optical.height * VISOR_LAYOUT.clearMaxBottomFraction) -
        clear.height,
    ),
  );
  const zones = Object.fromEntries(
    Object.entries(VISOR_LAYOUT.zones).map(([key, value]) => [
      key,
      {
        x: value.x * optical.width,
        y: value.y * optical.height,
        width: value.width * optical.width,
        height: value.height * optical.height,
      },
    ]),
  );
  zones.mission.y = inset;
  // Symmetric stepped positions follow the upper arc; text remains horizontal.
  zones.physiology.y = inset + unit * 0.6;
  zones.oxygen.y = zones.physiology.y;
  return { config, viewing, optical, clear, zones };
}
/** Fit the complete schematic with one isotropic scale, including on ultrawide windows. */
export function fitVisorScale(width, height, viewing) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  return Math.max(
    0,
    Math.min(
      (width - VISOR_LAYOUT.canvasPadding * 2) / viewing.width,
      (height - VISOR_LAYOUT.canvasPadding * 2) / viewing.height,
    ),
  );
}
export function rectStyle(rect) {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}
export function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
