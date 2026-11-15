import { visorOutlinePath } from '../geometry/visorGeometry';

/** Development drawing, never a physical visor model or an actual optical calibration. */
export function CalibrationOverlay({ geometry }) {
  const { viewing, optical, clear, zones, config } = geometry;
  return (
    <svg
      className="calibration-overlay"
      viewBox={`0 0 ${viewing.width} ${viewing.height}`}
      aria-label="Development optical calibration overlay"
      role="img"
    >
      <path d={visorOutlinePath(viewing.width, viewing.height)} className="calibration-viewing" />
      <text x={viewing.width / 2} y={40} textAnchor="middle">
        VIEWING BOUNDARY / VIEWPORT FIT / NOT TOTAL EMU FOV
      </text>
      <rect
        x={optical.x}
        y={optical.y}
        width={optical.width}
        height={optical.height}
        className="calibration-optical"
      />
      <text x={optical.x + optical.width / 2} y={optical.y - 12} textAnchor="middle">
        OPTICAL FIELD {config.opticalHorizontalDeg}° × {config.opticalVerticalDeg}° · ILLUSTRATIVE
      </text>
      <g transform={`translate(${optical.x} ${optical.y})`}>
        <rect
          x={clear.x}
          y={clear.y}
          width={clear.width}
          height={clear.height}
          className="calibration-clear"
        />
        <text x={optical.width / 2} y={optical.height / 2} textAnchor="middle">
          CENTRAL CLEAR {config.clearHorizontalDeg}° × {config.clearVerticalDeg}°
        </text>
        {Object.entries(zones).map(([key, zone]) => {
          const rect = zone;
          return (
            <g key={key}>
              <rect {...rect} className="calibration-zone" />
              <text x={rect.x + 4} y={rect.y - 4}>
                {key.toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
