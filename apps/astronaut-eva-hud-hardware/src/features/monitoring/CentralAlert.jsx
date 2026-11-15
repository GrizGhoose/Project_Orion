export function CentralAlert({ severity, heartRateElevated = false }) {
  if (severity === 'NORMAL') return null;
  return (
    <div
      className={`central-alert central-alert-${severity.toLowerCase()}`}
      role="alert"
      aria-atomic="true"
    >
      <span className="central-alert-title">{severity}</span>
      <span className="central-alert-message">
        {heartRateElevated
          ? 'OXYGEN SATURATION LOW · ELEVATED HEART RATE'
          : 'OXYGEN SATURATION LOW'}
      </span>
      {severity === 'CRITICAL' && (
        <strong className="central-alert-action">STOP EVA ACTIVITY</strong>
      )}
    </div>
  );
}
