import { HelmetHUD } from '../features/visor/HelmetHUD';
import { useMonitoring } from '../features/monitoring/useMonitoring';
import { DeveloperControls } from '../features/monitoring/DeveloperControls';
import { displayedSeverity } from '../features/monitoring/monitoringState';
import { isHeartRateElevated } from '../features/monitoring/baselineConfig';

export default function DemoApp() {
  const { state, send } = useMonitoring();
  return (
    <>
      <HelmetHUD
        telemetry={state.telemetry}
        severity={displayedSeverity(state)}
        heartRateElevated={isHeartRateElevated(state.telemetry, state.config)}
      />
      <DeveloperControls state={state} send={send} />
    </>
  );
}
