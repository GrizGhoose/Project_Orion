import { createContext, useContext, useEffect, useState } from 'react';
import { createSimulationProvider } from '../../services/telemetry/simulationProvider';
import { useTelemetryStore } from '../../store/telemetryStore';

const Context = createContext(null);
export function TelemetryProvider({ children }) {
  const [provider] = useState(() => createSimulationProvider());
  useEffect(() => {
    provider.start(
      useTelemetryStore.getState().applySnapshot,
      useTelemetryStore.getState().setConnection,
    );
    return () => provider.stop();
  }, [provider]);
  return <Context.Provider value={provider}>{children}</Context.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useTelemetryCommands() {
  return useContext(Context);
}
