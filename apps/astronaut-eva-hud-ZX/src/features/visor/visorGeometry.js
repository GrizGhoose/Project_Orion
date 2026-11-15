export const VISOR_WIDTH = 1920;

// The existing side boundary, now shared by the SVG and peripheral markers.
const SIDE_CURVES = [
  [
    [225, 34],
    [94, 122],
    [36, 297],
    [39, 520],
  ],
  [
    [39, 520],
    [42, 730],
    [136, 912],
    [307, 1040],
  ],
];

export const VISOR_SIDE_PATH = `M${SIDE_CURVES[0][0].join(' ')} ${SIDE_CURVES.map((curve) => `C${curve.slice(1).flat().join(' ')}`).join(' ')}`;

function cubic(curve, t, axis) {
  const u = 1 - t;
  return (
    u ** 3 * curve[0][axis] +
    3 * u ** 2 * t * curve[1][axis] +
    3 * u * t ** 2 * curve[2][axis] +
    t ** 3 * curve[3][axis]
  );
}

export function rightVisorPointAtY(y) {
  const boundedY = Math.min(1040, Math.max(34, y));
  const curve = SIDE_CURVES[boundedY <= 520 ? 0 : 1];
  let low = 0;
  let high = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (cubic(curve, mid, 1) < boundedY) low = mid;
    else high = mid;
  }
  return { x: VISOR_WIDTH - cubic(curve, (low + high) / 2, 0), y: boundedY };
}

export function buddyPlacement(y) {
  // Protect the whole 64-unit-high marker, including the chevron's right tip,
  // rather than merely keeping its centre inside the border.
  const innerEdge = Math.min(...[-32, 0, 32].map((offset) => rightVisorPointAtY(y + offset).x));
  return { x: innerEdge - 44, y, bearing: (Math.atan2(y - 540, 450) * 180) / Math.PI };
}
