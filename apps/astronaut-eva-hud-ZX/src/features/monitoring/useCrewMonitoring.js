import { useEffect, useReducer, useState } from 'react';
import { createCrewState, crewReducer } from './crewState';
import { SYNC_DEMO, subscribeDemo } from './demoSync';

export function useCrewMonitoring() {
  const [state, dispatch] = useReducer(crewReducer, undefined, createCrewState);
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    if (SYNC_DEMO) return subscribeDemo((snapshot) => dispatch({ type: 'demo', snapshot }), setLinked);
    const tick = () => dispatch({ type: 'tick', now: performance.now() });
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const sendToAstronaut = (id, command) =>
    !SYNC_DEMO && dispatch({ type: 'astronaut', id, command, now: performance.now() });
  const send = (command) => sendToAstronaut(state.pov, command);
  const selectPOV = (id) => dispatch({ type: 'pov', id });
  return { state, send, sendToAstronaut, selectPOV, linked, synchronized: SYNC_DEMO };
}
