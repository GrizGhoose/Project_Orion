import { memo, useEffect, useRef } from 'react';
import { buddyPlacement, VISOR_WIDTH } from '../visor/visorGeometry';
import { createBuddySimulation, formatBuddyDistance, INITIAL_BUDDY } from './buddySimulation';

const initialPosition = buddyPlacement(INITIAL_BUDDY.y);

export const BuddyGeolocator = memo(function BuddyGeolocator({
  severity = 'NORMAL',
  trackedId = 'EV2',
  side = 'right',
}) {
  const onLeft = side === 'left';
  const markerRef = useRef(null);
  const arrowRef = useRef(null);
  const distanceRef = useRef(null);

  useEffect(() => {
    if (typeof window.requestAnimationFrame !== 'function') return;
    const simulate = createBuddySimulation({ now: performance.now() });
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reducedMotion = preference?.matches ?? false;
    const onPreference = (event) => {
      reducedMotion = event.matches;
    };
    preference?.addEventListener('change', onPreference);
    let frame;
    let visibleDistance = '38 m';
    let previousY;
    function paint(timestamp) {
      const sample = simulate(timestamp);
      const y = reducedMotion ? INITIAL_BUDDY.y : sample.y;
      if (y !== previousY) {
        const position = buddyPlacement(y);
        markerRef.current.setAttribute('transform', `translate(${position.x} ${position.y})`);
        arrowRef.current.setAttribute('transform', `rotate(${position.bearing})`);
        previousY = y;
      }
      const formatted = formatBuddyDistance(sample.distance);
      if (formatted !== visibleDistance) {
        distanceRef.current.textContent = formatted;
        visibleDistance = formatted;
      }
      frame = window.requestAnimationFrame(paint);
    }
    frame = window.requestAnimationFrame(paint);
    return () => {
      window.cancelAnimationFrame(frame);
      preference?.removeEventListener('change', onPreference);
    };
  }, []);

  // React owns severity; the animation owns only transforms and distance text.
  // Severity changes never recreate the simulator or reset its position/range.
  return (
    <g
      className="buddy-locator-side"
      data-side={side}
      transform={onLeft ? `translate(${VISOR_WIDTH} 0) scale(-1 1)` : undefined}
    >
      <g
        ref={markerRef}
        className="buddy-geolocator"
        data-severity={severity}
        transform={`translate(${initialPosition.x} ${initialPosition.y})`}
        role="group"
        aria-label={`Buddy astronaut ${trackedId}, ${severity}, simulated`}
      >
        <path
          ref={arrowRef}
          className="buddy-direction"
          d="M-5 -11 L9 0 L-5 11"
          transform={`rotate(${initialPosition.bearing})`}
        />
        <text
          x={onLeft ? 20 : -20}
          y="-7"
          textAnchor={onLeft ? 'start' : 'end'}
          transform={onLeft ? 'scale(-1 1)' : undefined}
          className="buddy-label"
        >
          {trackedId}
        </text>
        <text
          ref={distanceRef}
          x={onLeft ? 20 : -20}
          y="20"
          textAnchor={onLeft ? 'start' : 'end'}
          transform={onLeft ? 'scale(-1 1)' : undefined}
          className="buddy-distance"
        >
          38 m
        </text>
      </g>
    </g>
  );
});
