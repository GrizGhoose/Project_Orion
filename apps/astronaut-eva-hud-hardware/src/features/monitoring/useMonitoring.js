import { useEffect, useReducer } from 'react';
import { createMonitoringState, monitoringReducer } from './monitoringState';
import { connectSensor, SENSOR_LINK_ENABLED } from '../../services/telemetry/sensorLink';

export function useMonitoring() {
  const [state, dispatch] = useReducer(monitoringReducer, undefined, createMonitoringState);
  useEffect(() => {
    const tick = () => dispatch({ type: 'tick', now: performance.now() });
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    // Live SpO₂ and heart rate from the crewmember's ESP32 + MAX30102.
    const stopLink = SENSOR_LINK_ENABLED
      ? connectSensor((sample) => dispatch({ type: 'live', sample, now: performance.now() }))
      : () => {};
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      stopLink();
    };
  }, []);
  const send = (action) => dispatch({ ...action, now: performance.now() });
  return { state, send };
}
