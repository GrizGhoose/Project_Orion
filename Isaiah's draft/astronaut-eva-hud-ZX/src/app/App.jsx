import { HelmetHUD } from '../features/visor/HelmetHUD';
import { useCrewMonitoring } from '../features/monitoring/useCrewMonitoring';
import { trackedAstronaut } from '../features/monitoring/crewState';
import { DeveloperControls } from '../features/monitoring/DeveloperControls';
import { displayedSeverity } from '../features/monitoring/monitoringState';
import { isHeartRateElevated } from '../features/monitoring/baselineConfig';

export default function App() {
  const { state: crew, send, sendToAstronaut, selectPOV } = useCrewMonitoring();
  const state = crew.astronauts[crew.pov];
  const buddyId = trackedAstronaut(crew.pov);
  const buddySeverity = displayedSeverity(crew.astronauts[buddyId]);
  return (
    <>
      <HelmetHUD
        telemetry={state.telemetry}
        severity={displayedSeverity(state)}
        heartRateElevated={isHeartRateElevated(state.telemetry, state.config)}
        buddySeverity={buddySeverity}
        pov={crew.pov}
        trackedId={buddyId}
      />
      <DeveloperControls
        key={crew.pov}
        state={state}
        send={send}
        pov={crew.pov}
        onPOVChange={selectPOV}
        astronauts={crew.astronauts}
        onAstronautDistressChange={(id, severity) =>
          sendToAstronaut(
            id,
            severity === 'NORMAL' ? { type: 'reset' } : { type: 'override', severity },
          )
        }
      />
    </>
  );
}
