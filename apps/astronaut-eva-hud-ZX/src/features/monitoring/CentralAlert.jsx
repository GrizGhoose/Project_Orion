export function CentralAlert({ severity, heartRateElevated = false, kind = 'own' }) {
  if (severity === 'NORMAL') return null;
  return (
    <div
      className={`central-alert central-alert-${severity.toLowerCase()}`}
      role="alert"
      aria-atomic="true"
      aria-label={kind === 'buddy' ? `${severity} | BUDDY IN DISTRESS` : undefined}
      data-alert-source={kind}
    >
      <span className="central-alert-title">{severity}</span>
      <span className="central-alert-message">
        {kind === 'buddy'
          ? 'BUDDY IN DISTRESS'
          : heartRateElevated
            ? 'OXYGEN SATURATION LOW · ELEVATED HEART RATE'
            : 'OXYGEN SATURATION LOW'}
      </span>
      {kind === 'own' && severity === 'CRITICAL' && (
        <strong className="central-alert-action">STOP EVA ACTIVITY</strong>
      )}
    </div>
  );
}
