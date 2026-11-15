import { useId } from 'react';
import { visorOutlinePath } from '../geometry/visorGeometry';

/** The scene mask is a viewing boundary, independent of the smaller optical aperture. */
export function VisorScene({ onImageError }) {
  const clipId = useId();
  const outline = visorOutlinePath(1, 1);
  return (
    <>
      <svg
        className="visor-outline"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={outline} />
          </clipPath>
        </defs>
        <path
          d={outline}
          fill="none"
          stroke="#35424a"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="visor-window" style={{ clipPath: `url(#${clipId})` }}>
        <img
          className="helmet-environment"
          src="/images/lunar-hud-background.png"
          alt="Supplied lunar photograph with Earth above the horizon, astronauts and a lander on the surface"
          onError={onImageError}
        />
      </div>
    </>
  );
}
