import { OctagonAlert, TriangleAlert } from 'lucide-react';
import { ALERT_CATEGORIES } from '../health/detectionConfig';
export function AlertList({ alerts, limit = 20 }) {
  return (
    <div className="space-y-2" aria-live="polite" aria-atomic="true">
      {alerts.slice(0, limit).map((alert) => {
        const Icon = alert.severity === 'critical' ? OctagonAlert : TriangleAlert;
        return (
          <div
            key={alert.id}
            className={`alert alert-${alert.severity}`}
            role={alert.severity === 'critical' ? 'alert' : 'status'}
          >
            <Icon className="shrink-0" size={22} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest">
                {alert.astronautId} · {alert.severity}
                {alert.category && ` · ${ALERT_CATEGORIES[alert.category] || alert.category}`}
                {alert.source && ` · ${alert.source}`}
              </div>
              <p className="mt-1 font-semibold">
                {alert.label}
                {alert.value !== undefined && ` · ${alert.value} ${alert.unit}`}
                {alert.reason && ` — ${alert.reason}`}
              </p>
              <p className="mt-1 text-sm opacity-90">{alert.action}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
