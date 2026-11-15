import { Check, TriangleAlert, OctagonAlert } from 'lucide-react';
export function Status({ severity = 'normal', children }) {
  const Icon =
    severity === 'critical' ? OctagonAlert : severity === 'warning' ? TriangleAlert : Check;
  return (
    <span className={`status status-${severity}`}>
      <Icon size={13} aria-hidden="true" />
      {children || (severity === 'normal' ? 'Nominal' : severity)}
    </span>
  );
}
