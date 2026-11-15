import { useEffect, useReducer } from 'react';
import { createCrewState, crewReducer } from './crewState';

export function useCrewMonitoring() {
  const [state, dispatch] = useReducer(crewReducer, undefined, createCrewState);
  useEffect(() => {
    const tick = () => dispatch({ type: 'tick', now: performance.now() });
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const sendToAstronaut = (id, command) =>
    dispatch({ type: 'astronaut', id, command, now: performance.now() });
  const send = (command) => sendToAstronaut(state.pov, command);
  const selectPOV = (id) => dispatch({ type: 'pov', id });
  return { state, send, sendToAstronaut, selectPOV };
}
