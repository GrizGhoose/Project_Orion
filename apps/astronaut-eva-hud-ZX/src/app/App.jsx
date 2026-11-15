import { HelmetHUD } from '../features/visor/HelmetHUD';
import { useCrewMonitoring } from '../features/monitoring/useCrewMonitoring';
import { trackedAstronaut } from '../features/monitoring/crewState';
import { DeveloperControls } from '../features/monitoring/DeveloperControls';
import { displayedSeverity } from '../features/monitoring/monitoringState';
import { isHeartRateElevated } from '../features/monitoring/baselineConfig';

export default function App() {
  const { state: crew, send, sendToAstronaut, selectPOV, linked, synchronized } = useCrewMonitoring();
  const state = crew.astronauts[crew.pov];
  const buddyId = trackedAstronaut(crew.pov);
  const buddySeverity = displayedSeverity(crew.astronauts[buddyId]);
  if (synchronized && !crew.demo) {
    return <main className="helmet-hud" role="status">Connecting to shared demo timeline…</main>;
  }
  return (
    <>
      <HelmetHUD
        telemetry={state.telemetry}
        severity={displayedSeverity(state)}
        heartRateElevated={isHeartRateElevated(state.telemetry, state.config)}
        buddySeverity={buddySeverity}
        pov={crew.pov}
        trackedId={buddyId}
        sharedElapsed={synchronized ? (crew.demo?.elapsedMs ?? 0) : undefined}
      />
      <DeveloperControls
        demoStatus={synchronized ? (linked ? 'Connected to shared timeline' : 'Connection lost — reconnecting') : null}
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
