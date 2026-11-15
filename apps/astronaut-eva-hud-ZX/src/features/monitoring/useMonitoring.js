import { useEffect, useReducer } from 'react';
import { createMonitoringState, monitoringReducer } from './monitoringState';

export function useMonitoring() {
  const [state, dispatch] = useReducer(monitoringReducer, undefined, createMonitoringState);
  useEffect(() => {
    const tick = () => dispatch({ type: 'tick', now: performance.now() });
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const send = (action) => dispatch({ ...action, now: performance.now() });
  return { state, send };
}
