import { useEffect } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { BaselineControls } from './BaselineControls';
import { DETECTION_RULES } from '../../features/health/detectionConfig';
import { SCENARIOS } from '../../simulation/scenarios';
import { useTelemetryCommands } from '../../app/providers/TelemetryProvider';
import { useTelemetryStore } from '../../store/telemetryStore';
import { useEvaStore } from '../../store/evaStore';
import { OPTICAL_CONTROLS } from '../../constants/opticalGeometry';

export function SimulationControls() {
  const { mode, setMode, astronautId, setAstronaut, suitRequested, toggleSuit, setPresentation } =
    useEvaStore();
  const enterAstronautView = () => {
    setPresentation('astronaut');
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const provider = useTelemetryCommands();
  const frame = useTelemetryStore((s) => s.frame);
  const paused = useTelemetryStore((s) => s.paused);
  const connection = useTelemetryStore((s) => s.connection);
  const events = useTelemetryStore((s) => s.events);
  const check = frame.reactionChecks?.[astronautId];
  const baseline = frame.baselines?.[astronautId];
  const assessment = frame.assessments?.[astronautId];
  const cooldown = check
    ? Math.max(
        0,
        Math.ceil(
          (check.startedAt + DETECTION_RULES.reactionCooldownMs - frame.timestampMs) / 1000,
        ),
      )
    : 0;
  const hud = useEvaStore((s) => s.hud);
  const configure = useEvaStore((s) => s.configureHud);
  const configureGeometry = useEvaStore((s) => s.configureGeometry);
  useEffect(() => {
    const onKey = (event) => {
      if (
        /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName) ||
        event.target.isContentEditable ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.key.toLowerCase() === 'c')
        configure({ calibration: !useEvaStore.getState().hud.calibration });
      if (event.key.toLowerCase() === 'p') provider.command({ type: 'pause' });
      if (event.key.toLowerCase() === 'r') provider.command({ type: 'reset' });
      if (/^[1-6]$/.test(event.key))
        provider.command({ type: 'scenario', scenario: SCENARIOS[Number(event.key) - 1].id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [provider, configure]);
  return (
    <aside className="dev-panel" aria-label="Development simulation controls">
      <h2 className="mb-4 text-sm font-semibold tracking-wider">
        DEVELOPER / SIMULATION CONTROLS — NOT VISIBLE TO ASTRONAUT
      </h2>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="HUD display mode" className="flex flex-wrap gap-2">
          {[
            ['standard', 'Standard EVA'],
            ['health', 'Health focus'],
            ['buddy', 'Buddy focus'],
            ['emergency', 'Emergency mode simulation'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`control-button ${mode === id ? 'selected' : ''}`}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-xs">
          Astronaut viewpoint
          <select value={astronautId} onChange={(e) => setAstronaut(e.target.value)}>
            {frame.astronauts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} / {a.name}
              </option>
            ))}
          </select>
        </label>
        <button className="control-button" aria-pressed={suitRequested} onClick={toggleSuit}>
          Suit details
        </button>
        <button className="control-button" onClick={enterAstronautView}>
          Astronaut view / Fullscreen
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-300">
        Escape returns to development view. Keys 1-6: scenarios; P: pause; R: reset; C: calibration.
        Emergency mode is a display simulation, not an emergency command. All readings are
        simulated; thresholds are illustrative and unvalidated.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Simulation settings">
          <p className="mb-3 text-xs text-slate-300">
            {connection === 'standalone'
              ? 'Local only · BroadcastChannel unavailable'
              : connection === 'source'
                ? 'Simulation source · same-origin snapshots'
                : connection === 'synced'
                  ? 'Synced simulation replica'
                  : 'Discovering simulation source'}
          </p>
          <label className="text-xs text-slate-300" htmlFor="scenario">
            Scenario · keys 1–6
          </label>
          <select
            id="scenario"
            className="mt-2 w-full"
            value={frame.scenario}
            onChange={(event) =>
              provider.command({ type: 'scenario', scenario: event.target.value })
            }
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="my-3 text-xs text-slate-400">
            {SCENARIOS.find((s) => s.id === frame.scenario)?.description}
          </p>
          <div className="flex gap-2">
            <button className="control-button" onClick={() => provider.command({ type: 'pause' })}>
              {paused ? <Play size={14} /> : <Pause size={14} />} Pause / resume (P)
            </button>
            <button className="control-button" onClick={() => provider.command({ type: 'reset' })}>
              <RotateCcw size={14} />
              Reset (R)
            </button>
          </div>
          <div
            role="group"
            aria-label="Advance simulation time"
            className="mt-3 flex flex-wrap gap-2"
          >
            {[1, 15, 30, 60].map((seconds) => (
              <button
                key={seconds}
                className="control-button"
                onClick={() => provider.command({ type: 'advance', seconds })}
              >
                Advance +{seconds}s
              </button>
            ))}
          </div>
          <p className="my-3 text-xs text-slate-300">
            Logical simulation time: {(frame.timestampMs / 1000).toFixed(0)} s. Advance evaluates
            every intervening second, including while paused. Scenario changes reset detector
            history, preserving baselines.
          </p>
          <BaselineControls
            key={`${astronautId}-${baseline?.revision || 0}`}
            astronautId={astronautId}
            baseline={baseline}
            command={(command) => provider.command(command)}
          />
          <section
            aria-label="Derived supporting evidence"
            className="my-4 space-y-2 text-xs text-slate-300"
          >
            <h3 className="eyebrow">Derived supporting evidence / {astronautId}</h3>
            <p>
              SpO2 change:{' '}
              {assessment?.spo2Delta == null
                ? 'Baseline unavailable'
                : `${assessment.spo2Delta.toFixed(1)} percentage points`}
            </p>
            <p>
              Trend:{' '}
              {assessment?.trend
                ? `${assessment.trend.declinePerMinute.toFixed(2)} pp/min decline; ${assessment.trend.samples} samples`
                : 'Collecting valid timestamped samples'}
            </p>
            {assessment?.support.map((item) => (
              <p key={item.signal}>
                {item.signal}: {item.level}
                {item.available && item.delta != null ? ` (delta ${item.delta.toFixed(1)})` : ''}
              </p>
            ))}
            <p>
              Supporting evidence cannot independently raise hypoxia alerts. Rhythm detection is
              disabled. HRV is unavailable without an explicit signal and baseline. Breathing is
              simulated, not ECG-derived.
            </p>
          </section>
          <section
            className="my-4 space-y-3 border-t border-line pt-4"
            aria-label="Simulated reaction check controls"
          >
            <h3 className="eyebrow">Simulated reaction check / {astronautId}</h3>
            <p className="text-xs text-slate-300">
              Start, then wait or advance +1s for a brief HUD cue. J simulates the chest button; K
              is incorrect. Deadlines follow simulation time. Checks have a 60s cooldown.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="control-button disabled:opacity-40"
                disabled={cooldown > 0}
                onClick={() => provider.command({ type: 'reaction-start', astronautId })}
              >
                Start reaction check
              </button>
              <button
                className="control-button disabled:opacity-40"
                disabled={!check || check.status === 'waiting' || check.acknowledged}
                onClick={() => provider.command({ type: 'reaction-ack', astronautId })}
              >
                Acknowledge reaction result
              </button>
            </div>
            <p className="text-xs text-slate-300" role="status">
              {check
                ? `${check.status}${check.reason ? ' / ' + check.reason : ''}${cooldown ? ' / cooldown ' + cooldown + 's' : ''}`
                : 'No check requested'}
            </p>
          </section>
          <details className="border-t border-line pt-3 text-xs">
            <summary>Simulation event log (includes intended buddy escalations)</summary>
            <ol aria-label="Simulation event log" className="mt-3 space-y-2 text-slate-300">
              {events.slice(0, 8).map((event) => (
                <li key={event.id}>
                  {event.time.toFixed(1)}s / {event.text}
                </li>
              ))}
            </ol>
          </details>
        </section>
        <fieldset className="mt-4 space-y-3 border-t border-line pt-4">
          <legend className="eyebrow">Visor-local optical geometry</legend>
          <p className="text-xs text-slate-300">
            Viewing schematic: 70 x 50 deg. Optical field: {hud.geometry.opticalHorizontalDeg} x{' '}
            {hud.geometry.opticalVerticalDeg} deg. Neither is a certified astronaut specification.
          </p>
          <label className="flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={hud.calibration}
              onChange={(event) => configure({ calibration: event.target.checked })}
            />
            Show calibration overlay (C)
          </label>
          {OPTICAL_CONTROLS.map(({ key, label, min, max, step }) => (
            <label key={key} className="grid gap-1 text-xs">
              {label} ({hud.geometry[key]} deg)
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={hud.geometry[key]}
                onChange={(event) => configureGeometry({ [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <label className="grid gap-1 text-xs">
            Routine readout opacity ({hud.brightness}%)
            <input
              aria-label="Routine readout opacity"
              type="range"
              min="55"
              max="100"
              value={hud.brightness}
              onChange={(event) => configure({ brightness: Number(event.target.value) })}
            />
          </label>
          <p className="text-xs text-slate-300">
            The browser fits one angular schematic; it is not hardware resolution. Small windows
            show a miniature. Enlarge the canvas for legibility review. Calibration requires eye
            position, eye box, binocular alignment and optics.
          </p>
        </fieldset>
      </div>
    </aside>
  );
}
