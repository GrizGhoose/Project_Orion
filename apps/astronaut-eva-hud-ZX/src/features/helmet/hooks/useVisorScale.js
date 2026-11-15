import { useEffect, useRef, useState } from 'react';
import { fitVisorScale } from '../geometry/visorGeometry';
import { OPTICAL_DEFAULTS, VISOR_LAYOUT } from '../../../constants/opticalGeometry';
const viewing = {
  width: OPTICAL_DEFAULTS.viewingHorizontalDeg * VISOR_LAYOUT.unitsPerDegree,
  height: OPTICAL_DEFAULTS.viewingVerticalDeg * VISOR_LAYOUT.unitsPerDegree,
};
export function useVisorScale() {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState(null);
  const scale = viewport ? fitVisorScale(viewport.width, viewport.height, viewing) : 1;
  useEffect(() => {
    const element = canvasRef.current;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setViewport({ width, height });
    };
    if (typeof ResizeObserver === 'undefined') {
      const frame = requestAnimationFrame(measure);
      window.addEventListener('resize', measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', measure);
      };
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Also handle browser resizes while ResizeObserver delivery is throttled in a hidden tab.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return { canvasRef, scale, viewport };
}
