/** A bounded reference-axis marker (or a reserve fill), independent of alert rules. */
export function TelemetryBar({
  value,
  scale,
  severity = 'normal',
  simulated = true,
  curved = false,
  quality = Number.isFinite(value) ? 'valid' : 'unavailable',
}) {
  const { label, unit, min, max, decimals, fill } = scale;
  const available = Number.isFinite(value) && quality === 'valid';
  const indicatorSeverity = available ? severity : 'warning';
  const position = available ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const outside = available && (value < min || value > max);
  const reading = available ? value.toFixed(decimals) : '—';
  return (
    <div className={`telemetry-bar status-${indicatorSeverity}`} data-parameter={label}>
      <div className="indicator-heading">
        <span>{label}</span>
        <span className="indicator-number">
          {reading} <small>{unit}</small>
        </span>
      </div>
      <div
        className={`indicator-axis${curved ? ' indicator-axis-curved' : ''}`}
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={available ? Math.max(min, Math.min(max, value)) : undefined}
        aria-valuetext={`${available ? `${reading} ${unit}` : 'Unavailable'}; ${simulated ? 'simulated' : 'telemetry'}; ${available ? severity : quality}${outside ? '; outside display scale' : ''}. Display scale is not a safety assessment.`}
      >
        {curved && (
          <svg
            className="indicator-curve"
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="indicator-curve-track" d="M 0 1 Q 50 9 100 1" />
            {[0, 0.25, 0.5, 0.75, 1].map((x) => {
              const y = 1 + 16 * x * (1 - x);
              return (
                <path
                  key={x}
                  className="indicator-curve-tick"
                  d={`M ${x * 100} ${y - 1.5} V ${y + 1.5}`}
                />
              );
            })}
            {available && fill && (
              <path
                className="indicator-curve-fill"
                d="M 0 1 Q 50 9 100 1"
                pathLength="100"
                strokeDasharray={`${position * 100} 100`}
              />
            )}
          </svg>
        )}
        {available && (
          <span
            className={fill ? 'indicator-fill' : 'indicator-marker'}
            style={
              fill
                ? { width: `${position * 100}%` }
                : {
                    left: `${position * 100}%`,
                    ...(curved ? { top: 1 + 16 * position * (1 - position) - 4.5 } : {}),
                  }
            }
          />
        )}
      </div>
      <div className="indicator-scale" aria-hidden="true">
        <span>{min}</span>
        <span>
          {!available
            ? quality.toUpperCase()
            : outside
              ? value < min
                ? 'BELOW DISPLAY SCALE'
                : 'ABOVE DISPLAY SCALE'
              : severity === 'normal'
                ? fill
                  ? 'RESERVE · EST.'
                  : 'DISPLAY SCALE'
                : severity.toUpperCase()}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}
