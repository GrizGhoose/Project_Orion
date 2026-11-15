import { useEffect, useMemo, useState } from 'react';
import { measurementQuality, DATA_QUALITY } from '../../health/measurementQuality';
import { qualityAlert, sortAlerts } from '../../health/detectionEngine';
import { useTelemetryStore } from '../../../store/telemetryStore';
/** Consumes authoritative assessments. The local watchdog inhibits stale physiology only. */
export function useHelmetAlerts(frame) {
  const receivedAt = useTelemetryStore((s) => s.receivedAt);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return useMemo(() => {
    const spo2Quality = Object.fromEntries(
      frame.astronauts.map((a) => [
        a.id,
        now - receivedAt > DATA_QUALITY.staleAfterMs
          ? 'stale'
          : frame.assessments?.[a.id]?.spo2Quality &&
              frame.assessments[a.id].spo2Quality !== 'valid'
            ? frame.assessments[a.id].spo2Quality
            : measurementQuality(a, 'spo2', { now: frame.simulated ? frame.timestampMs : now }),
      ]),
    );
    const alerts = (frame.alerts || []).filter(
      (a) => !(a.category === 'hypoxia' && spo2Quality[a.astronautId] !== 'valid'),
    );
    for (const a of frame.astronauts)
      if (spo2Quality[a.id] !== 'valid' && !alerts.some((e) => e.id === `${a.id}-spo2-quality`))
        alerts.push(
          qualityAlert(
            a.id,
            'spo2',
            spo2Quality[a.id],
            frame.simulated ? 'simulated' : 'telemetry',
          ),
        );
    const signalQuality = Object.fromEntries(
      frame.astronauts.map((a) => [
        a.id,
        Object.fromEntries(
          ['heartRate', 'breathingRate'].map((parameter) => [
            parameter,
            now - receivedAt > DATA_QUALITY.staleAfterMs
              ? 'stale'
              : measurementQuality(a, parameter, {
                  now: frame.simulated ? frame.timestampMs : now,
                }),
          ]),
        ),
      ]),
    );
    return { alerts: sortAlerts(alerts), spo2Quality, signalQuality };
  }, [frame, now, receivedAt]);
}
