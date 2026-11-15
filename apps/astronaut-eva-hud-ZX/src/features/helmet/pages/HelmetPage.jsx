import { useEffect, useMemo, useState } from 'react';
import { useTelemetryStore } from '../../../store/telemetryStore';
import { useEvaStore } from '../../../store/evaStore';
import { statusFor } from '../../alerts/alertLogic';
import { AlertList } from '../../alerts/AlertList';
import { Status } from '../../../components/ui/Status';
import { TelemetryBar } from '../../../components/telemetry/TelemetryBar';
import { INDICATOR_SCALES } from '../../../constants/telemetryIndicators';
import { formatTime } from '../../../utils/format';
import { createVisorGeometry, rectStyle } from '../geometry/visorGeometry';
import { useVisorScale } from '../hooks/useVisorScale';
import { useReactionInput } from '../hooks/useReactionInput';
import { DETECTION_RULES } from '../../health/detectionConfig';
import { useHelmetAlerts } from '../hooks/useHelmetAlerts';
import { CalibrationOverlay } from '../components/CalibrationOverlay';
import { SimulationControls } from '../../../components/layout/SimulationControls';
import { VisorScene } from '../components/VisorScene';
import { UpperVisorFrame } from '../components/UpperVisorFrame';

const healthParameters = ['spo2', 'reaction', 'rhythm'];
const suitParameters = ['suitFault', 'communication'];

/** Every projected element is optical-local; only its containing viewing plane scales. */
export function HelmetPage() {
  const frame = useTelemetryStore((s) => s.frame);
  const { mode, astronautId, hud, suitRequested, presentation, setPresentation } = useEvaStore();
  const astronautView = presentation === 'astronaut';
  useEffect(() => {
    const exit = (event) => {
      if (event.key === 'Escape' && import.meta.env.DEV) setPresentation('development');
    };
    const fullscreenChanged = () => {
      if (!document.fullscreenElement && import.meta.env.DEV) setPresentation('development');
    };
    window.addEventListener('keydown', exit);
    document.addEventListener('fullscreenchange', fullscreenChanged);
    return () => {
      window.removeEventListener('keydown', exit);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
    };
  }, [setPresentation]);
  const { canvasRef, scale, viewport } = useVisorScale();
  const geometry = useMemo(
    () => createVisorGeometry(hud.geometry, viewport),
    [hud.geometry, viewport],
  );
  const assessment = useHelmetAlerts(frame);
  useReactionInput(frame, astronautId);
  const derived = frame.assessments?.[astronautId];
  const reaction = frame.reactionChecks?.[astronautId];
  const showStimulus =
    reaction?.status === 'waiting' &&
    frame.timestampMs >= reaction.stimulusAt &&
    frame.timestampMs < reaction.stimulusAt + DETECTION_RULES.stimulusMs;
  const { optical, zones } = geometry;

  const [sceneAvailable, setSceneAvailable] = useState(true);
  const astronaut = frame.astronauts.find((a) => a.id === astronautId);
  const buddy = frame.astronauts.find((a) => a.id !== astronautId);
  const alerts = assessment.alerts;
  const ownAlerts = alerts.filter((alert) => alert.astronautId === astronautId);
  const buddyAlerts = alerts.filter((alert) => alert.astronautId === buddy.id);
  const showSuit =
    suitRequested ||
    ownAlerts.some((a) => suitParameters.includes(a.parameter)) ||
    mode === 'emergency';
  const showBuddy = mode === 'buddy' || mode === 'emergency' || buddyAlerts.length > 0;
  const healthStatus = statusFor(alerts, astronautId, healthParameters);
  const safety = alerts.some((a) => a.severity === 'critical')
    ? 'critical'
    : alerts.length
      ? 'warning'
      : 'normal';

  return (
    <main
      id="main-content"
      className={`helmet-page ${astronautView ? 'astronaut-view' : 'development-view'}`}
    >
      <h1 className="sr-only">Astronaut helmet heads-up display</h1>
      <div className="visor-canvas" ref={canvasRef}>
        <VisorScene onImageError={() => setSceneAvailable(false)} />
        <section
          className="visor-plane"
          aria-label="Simulated helmet field of view"
          data-scale={scale}
          style={{
            width: geometry.viewing.width,
            height: geometry.viewing.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <div
            className="optical-field"
            role="region"
            aria-label="Illustrative optical display field"
            style={{
              ...rectStyle(optical),
              '--hud-opacity': hud.brightness / 100,
            }}
          >
            <UpperVisorFrame width={optical.width} height={optical.height} />
            <div className="hud-top-layout" role="region" aria-label="Primary astronaut telemetry">
              <section
                aria-label="Physiological monitoring"
                className="hud-indicator-group"
                data-placement="physiology"
                style={rectStyle(zones.physiology)}
              >
                <div className="hud-wing-surface hud-wing-left">
                  <h2>PHYSIOLOGY / {frame.simulated ? 'SIMULATED' : 'TELEMETRY'}</h2>
                  <TelemetryBar
                    curved
                    value={astronaut.breathingRate}
                    quality={assessment.signalQuality[astronautId].breathingRate}
                    scale={INDICATOR_SCALES.breathingRate}
                    simulated={frame.simulated}
                  />
                  <TelemetryBar
                    curved
                    value={astronaut.heartRate}
                    quality={assessment.signalQuality[astronautId].heartRate}
                    scale={INDICATOR_SCALES.heartRate}
                    severity="normal"
                    simulated={frame.simulated}
                  />
                </div>
              </section>
              <section
                aria-label="EVA mission timer"
                className="hud-mission"
                data-placement="mission"
                style={rectStyle(zones.mission)}
              >
                {/* <div className="mission-source">
                  {astronaut.id} / {frame.simulated ? 'SIMULATED' : 'TELEMETRY'}
                </div> */}
                <time aria-label="EVA countdown" dateTime={`PT${frame.remaining}S`}>
                  {formatTime(frame.remaining)}
                </time>
                <h2 className="pt-2">EVA remaining · est.</h2>
                <Status severity={safety}>
                  {safety === 'normal' ? 'Nominal' : `${safety} · ${alerts.length} active`}
                </Status>
              </section>
              <section
                aria-label="Oxygen monitoring"
                className="hud-indicator-group"
                data-placement="oxygen"
                style={rectStyle(zones.oxygen)}
              >
                <div className="hud-wing-surface hud-wing-right">
                  <h2>OXYGEN / {frame.simulated ? 'SIMULATED' : 'TELEMETRY'}</h2>
                  <TelemetryBar
                    curved
                    value={astronaut.spo2}
                    quality={assessment.spo2Quality[astronautId]}
                    scale={INDICATOR_SCALES.spo2}
                    severity={statusFor(alerts, astronautId, ['spo2'])}
                    simulated={frame.simulated}
                  />
                  <TelemetryBar
                    curved
                    value={astronaut.oxygen}
                    scale={INDICATOR_SCALES.oxygen}
                    severity="normal"
                    simulated={frame.simulated}
                  />
                </div>
              </section>
            </div>
            <div className="hud-context-layout">
              {!sceneAvailable && (
                <p
                  className="optical-provenance"
                  data-placement="provenance"
                  style={rectStyle(zones.provenance)}
                >
                  SCENE IMAGE UNAVAILABLE
                </p>
              )}

              {showSuit ? (
                <section
                  id="suit-context"
                  className="hud-context"
                  aria-label="Suit context"
                  data-placement="context"
                  style={rectStyle(zones.context)}
                >
                  <h2>Suit / simulated</h2>
                  <dl className="context-values">
                    <div>
                      <dt>Pressure</dt>
                      <dd>
                        {Number.isFinite(astronaut.pressure)
                          ? astronaut.pressure.toFixed(1)
                          : 'Unavailable'}{' '}
                        <span>kPa</span>
                      </dd>
                    </div>
                    <div>
                      <dt>CO₂</dt>
                      <dd>
                        {Number.isFinite(astronaut.co2) ? astronaut.co2.toFixed(1) : 'Unavailable'}{' '}
                        <span>mmHg</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Link</dt>
                      <dd>{astronaut.communication ? 'Available' : 'LOST'}</dd>
                    </div>
                  </dl>
                </section>
              ) : (
                mode === 'health' && (
                  <section
                    className="hud-context"
                    aria-label="Physiological context"
                    data-placement="context"
                    style={rectStyle(zones.context)}
                  >
                    <h2>Derived / SpO₂ gate</h2>
                    <div className="mt-2">
                      <Status severity={healthStatus}>
                        {healthStatus === 'normal' ? 'Gate not triggered' : healthStatus}
                      </Status>
                    </div>
                    <p className="mt-2">
                      {derived?.spo2Delta == null
                        ? 'Baseline unavailable'
                        : `Δ SpO₂ ${derived.spo2Delta.toFixed(1)} pp`}
                      . Supporting evidence:{' '}
                      {derived?.support.filter((item) => item.level.endsWith('-support')).length ??
                        0}
                      .
                    </p>
                    <p className="mt-2">Hypoxia assessment not validated.</p>
                  </section>
                )
              )}

              {showBuddy && (
                <section
                  className="hud-context"
                  aria-label="Buddy context"
                  data-placement="buddy"
                  style={rectStyle(zones.buddy)}
                >
                  <h2>BUDDY / {buddy.id}</h2>
                  <dl className="context-values">
                    <div>
                      <dt>SpO₂</dt>
                      <dd>
                        {assessment.spo2Quality[buddy.id] === 'valid'
                          ? `${buddy.spo2.toFixed(1)} %`
                          : assessment.spo2Quality[buddy.id].toUpperCase()}
                      </dd>
                    </div>
                    <div>
                      <dt>HR</dt>
                      <dd>
                        {buddy.heartRate} <span>BPM</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Health</dt>
                      <dd>
                        <Status severity={statusFor(alerts, buddy.id, healthParameters)} />
                      </dd>
                    </div>
                    <div>
                      <dt>Suit</dt>
                      <dd>
                        <Status severity={statusFor(alerts, buddy.id, suitParameters)} />
                      </dd>
                    </div>
                    <div>
                      <dt>Link</dt>
                      <dd>{buddy.communication ? 'Available' : 'LOST'}</dd>
                    </div>
                  </dl>
                </section>
              )}

              {showStimulus && (
                <div
                  className="reaction-stimulus"
                  role="status"
                  aria-label="Reaction check stimulus"
                  style={{
                    left: zones.mission.x,
                    top: zones.alerts.y - 28,
                    width: zones.mission.width,
                  }}
                >
                  <span aria-hidden="true" className="reaction-ring" /> REACTION CHECK / RESPOND
                </div>
              )}
              <div
                className="hud-alert-zone"
                aria-label="Prioritised crew alerts"
                data-placement="alerts"
                style={rectStyle(zones.alerts)}
                tabIndex={alerts.length ? 0 : undefined}
              >
                <AlertList alerts={alerts} />
              </div>
            </div>
          </div>
          {import.meta.env.DEV && !astronautView && hud.calibration && (
            <CalibrationOverlay geometry={geometry} />
          )}
        </section>
      </div>
      {import.meta.env.DEV && !astronautView && <SimulationControls />}
    </main>
  );
}
