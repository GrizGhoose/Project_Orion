import { useState } from 'react';
import { TELEMETRY } from '../visor/config';
import {
  validateBaseline,
  spo2Threshold,
  heartRateThreshold,
  isHeartRateElevated,
} from './baselineConfig';
import { controlMode, displayedSeverity, TELEMETRY_LIMITS } from './monitoringState';
import { SCENARIOS } from './scenarioSimulator';
import { BUDDY_STATES } from '../buddy/buddySimulation';
import { ASTRONAUT_IDS, trackedAstronaut } from './crewState';

// Distress buttons take the same amber / red accents as the manual overrides.
const DISTRESS_CLASS = { WARNING: 'developer-warning', CRITICAL: 'developer-critical' };

const BASELINE_FIELDS = [
  ['spo2BaselineMean', 'SpO₂ baseline mean (%)'],
  ['spo2BaselineStdDev', 'SpO₂ baseline SD (%)'],
  ['heartRateBaselineMean', 'HR baseline mean (BPM)'],
  ['heartRateBaselineStdDev', 'HR baseline SD (BPM)'],
  ['heartRateElevatedSd', 'HR elevation multiplier (SD)'],
  ['warningDurationMs', 'Warning duration (ms)'],
  ['criticalDurationMs', 'Critical duration (ms)'],
  ['recoveryDurationMs', 'Recovery duration (ms)'],
];

export function DeveloperControls({
  state,
  send,
  pov = 'EV1',
  onPOVChange,
  astronauts,
  onAstronautDistressChange,
}) {
  const [draft, setDraft] = useState(() => ({ ...state.config }));
  const [error, setError] = useState('');
  const severity = displayedSeverity(state);
  const duration = (since) =>
    since === null ? '0.0 s' : `${(Math.max(0, state.now - since) / 1000).toFixed(1)} s`;
  const status = [
    ['Current POV', pov],
    ['Tracking', trackedAstronaut(pov)],
    ['Current State', severity],
    ['Control Mode', controlMode(state)],
    ['Active Scenario', SCENARIOS.find(({ id }) => id === state.scenario?.id)?.label ?? 'None'],
    ['SpO₂ Threshold', `${Number(spo2Threshold(state.config).toFixed(2))}%`],
    ['SpO₂ Breach Duration', duration(state.engine.breachSince)],
    ['Recovery Duration', duration(state.engine.recoverySince)],
    ['HR Elevated', isHeartRateElevated(state.telemetry, state.config) ? 'Yes' : 'No'],
  ];
  function applyBaseline(event) {
    event.preventDefault();
    try {
      if (Object.values(draft).some((value) => value === ''))
        throw new RangeError('Complete every baseline field.');
      const config = Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [key, Number(value)]),
      );
      validateBaseline(config);
      send({ type: 'config', config });
      setError('');
    } catch (cause) {
      setError(cause.message);
    }
  }
  return (
    <section className="developer-panel" aria-labelledby="developer-heading">
      <header>
        <p className="developer-eyebrow">NASA SPACE APPS · PROTOTYPE TOOLS</p>
        <h1 id="developer-heading">Developer Control Panel</h1>
        <p>
          Simulated physiology only. These thresholds and recovery timings are prototype
          assumptions, not clinically validated astronaut medical guidance.
        </p>
      </header>
      <div className="developer-grid">
        <div className="developer-controls">
          <fieldset>
            <legend>Astronaut perspectives &amp; distress · simulated</legend>
            <p>
              View either astronaut. Each keeps independent physiology, detection timers and
              distress. The locator tracks the other astronaut; switching perspective preserves
              movement and distance. Scenario and telemetry controls below apply to the selected
              POV.
            </p>
            <div className="developer-buttons">
              {ASTRONAUT_IDS.map((id) => (
                <button key={id} aria-pressed={pov === id} onClick={() => onPOVChange?.(id)}>
                  View {id}
                </button>
              ))}
            </div>
            {ASTRONAUT_IDS.map((id) => (
              <fieldset key={id}>
                <legend>
                  {id} distress — {astronauts ? displayedSeverity(astronauts[id]) : 'NORMAL'}
                </legend>
                <div className="developer-buttons">
                  {BUDDY_STATES.map((severity) => (
                    <button
                      key={severity}
                      className={DISTRESS_CLASS[severity]}
                      aria-pressed={
                        astronauts
                          ? displayedSeverity(astronauts[id]) === severity
                          : severity === 'NORMAL'
                      }
                      onClick={() => onAstronautDistressChange?.(id, severity)}
                    >
                      {id} {severity.charAt(0) + severity.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <p>
              Normal resets only that astronaut. Warning/Critical are latched demo overrides;
              selecting a scenario resumes that astronaut’s automatic detection. Own critical alerts
              take priority over buddy notifications.
            </p>
          </fieldset>
          <fieldset>
            <legend>Manual visual overrides</legend>
            <p>
              Warning and Critical bypass automatic detection and stay latched until reset, another
              override, or a scenario starts.
            </p>
            <div className="developer-buttons">
              <button onClick={() => send({ type: 'reset' })}>Normal / Reset</button>
              <button
                className="developer-warning"
                aria-pressed={state.override === 'WARNING'}
                onClick={() => send({ type: 'override', severity: 'WARNING' })}
              >
                Trigger Warning
              </button>
              <button
                className="developer-critical"
                aria-pressed={state.override === 'CRITICAL'}
                onClick={() => send({ type: 'override', severity: 'CRITICAL' })}
              >
                Trigger Critical
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Automated scenarios</legend>
            <p>
              Each starts with 2 seconds of baseline, ramps for 2 seconds, then holds. Low SpO₂
              triggers at 3 / 5 seconds after the first observed breach. Set SpO₂ back to 98% to
              demonstrate recovery.
            </p>
            <div className="developer-scenarios">
              {SCENARIOS.map(({ id, label }) => (
                <button
                  key={id}
                  aria-pressed={state.scenario?.id === id}
                  onClick={() => send({ type: 'scenario', id })}
                >
                  {label}
                </button>
              ))}
            </div>
            <button disabled={!state.scenario} onClick={() => send({ type: 'stop' })}>
              Stop Simulation
            </button>
            <p>Stopping holds the current readings; automatic detection continues.</p>
          </fieldset>
          <fieldset>
            <legend>Live simulated telemetry</legend>
            <p>
              Adjusting a reading stops a running scenario. Automatic detection continues unless a
              visual override is latched.
            </p>
            <div className="developer-inputs">
              {Object.entries(TELEMETRY).map(([key, metric]) => (
                <label key={key}>
                  {metric.label} ({metric.unit})
                  <input
                    type="number"
                    step={key === 'spo2' ? '0.1' : '1'}
                    min={TELEMETRY_LIMITS[key][0]}
                    max={TELEMETRY_LIMITS[key][1]}
                    value={state.telemetry[key]}
                    onChange={(event) =>
                      send({ type: 'telemetry', key, value: event.target.valueAsNumber })
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <aside className="developer-status" aria-label="Developer monitoring status">
          <h2>Live monitoring status</h2>
          <dl>
            {status.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd
                  data-testid={label}
                  data-severity={label === 'Current State' ? value : undefined}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            HR elevated: &gt; {Number(heartRateThreshold(state.config).toFixed(2))} BPM (baseline
            mean + configured SD multiplier). HR never gates severity.
          </p>
          {state.override && (
            <p className="developer-override-note">
              Visual override active. Breach/recovery timers are suspended; this state is not an
              automatic detection result.
            </p>
          )}
          <form onSubmit={applyBaseline} noValidate>
            <h2>Astronaut baseline &amp; timing</h2>
            <div className="developer-inputs">
              {BASELINE_FIELDS.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    step="any"
                    value={draft[key]}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            <p>
              SpO₂ threshold = mean − 3 SD. Applying validated settings cancels any scenario and
              restarts detection with the current readings. A visual override stays latched.
            </p>
            <button type="submit">Apply Baseline</button>
            {error && (
              <p className="developer-config-error" role="status">
                {error}
              </p>
            )}
          </form>
        </aside>
      </div>
    </section>
  );
}
