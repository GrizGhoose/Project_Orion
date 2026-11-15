# Physiological monitoring prototype

## Detection and recovery

The active monitoring implementation is isolated in `src/features/monitoring/`; older health/scenario modules are not imported by the current app.

- SpO₂ is the only physiological severity gate: `currentSpO2 < spo2BaselineMean - 3 * spo2BaselineStdDev`. Defaults are 98% mean and 1% SD, giving a strict 95% threshold. Equality is normal.
- A continuously abnormal reading stays NORMAL until 3 seconds, becomes WARNING at 3 seconds, and CRITICAL at 5 seconds from the original breach. HR cannot change these timings.
- An active alert clears only after 3 uninterrupted seconds at or above the SpO₂ threshold. This recovery interval is configurable and is an illustrative prototype assumption.
- A normal sample before WARNING cancels the pending breach immediately. Normal samples during an active alert start recovery and end the continuous breach. A renewed breach cancels recovery and holds the existing severity. A held WARNING needs a fresh continuous five-second breach to escalate; CRITICAL stays latched until recovery.
- Invalid SpO₂ samples prove neither continuous breach nor recovery: they reset both continuity timers and preserve any active severity. Developer inputs reject nonfinite and out-of-range values.
- HR elevation is independently defined as `heartRate > baselineMean + elevationSdMultiplier * baselineStdDev`: defaults 72 + 3 × 10 = 102 BPM. This changes supporting evidence only. HR at 120 BPM with normal SpO₂ remains NORMAL.

All baseline fields and durations are validated before application. SpO₂ SD and HR SD must be positive; all values must be finite; the derived SpO₂ threshold must be positive; critical timing cannot precede warning timing. The developer form reports invalid settings without applying them. Applying valid baseline settings starts a fresh assessment with current telemetry and cancels the scenario, while leaving a manual visual override latched.

## Controls and scenarios

Open the app, then scroll below the full-height helmet to the **Developer Control Panel**. There are no developer controls inside the visor.

- **Normal / Reset:** restores 98% SpO₂, 72 BPM, 16 breaths/min, and 85% reserve. Clears detection, recovery, scenario selection, and overrides. Retains the configured baseline settings and never resets the EVA stopwatch.
- **Trigger Warning / Trigger Critical:** developer visual overrides. Set a representative below-threshold SpO₂ reading and latch the requested display immediately, independently of the automatic engine. Telemetry adjustments and Stop Simulation do not clear the override. Reset, another override, or a scenario selection replaces it.
- **Scenario 1:** holds default telemetry.
- **Scenario 2:** ramps SpO₂ from 98% to 92%, keeping HR at 72 BPM.
- **Scenario 3:** ramps SpO₂ from 98% to 92% and HR from 72 to 120 BPM.
- **Scenario 4:** ramps HR from 72 to 120 BPM, holding SpO₂ at 98%.
- Scenarios start with two seconds of baseline, ramp for two seconds, then hold until stopped or replaced. Detection begins at the first observed threshold breach, not scenario selection. Scenarios deliberately use the specified fixed demo readings; customized baselines can change their detection outcomes.
- **Stop Simulation:** freezes current telemetry and returns to Automatic mode; automatic assessment continues. To demonstrate recovery after a low-SpO₂ scenario, set SpO₂ to 98% (or above your configured threshold) and allow three seconds.
- Editing any telemetry input cancels the scenario immediately, then runs the same engine in Automatic mode. An existing visual override remains latched.

## Architecture and timing assumptions

[alertEngine.js](../src/features/monitoring/alertEngine.js) is a pure timestamp-driven state machine. [baselineConfig.js](../src/features/monitoring/baselineConfig.js) owns settings and validation. [monitoringState.js](../src/features/monitoring/monitoringState.js) manages telemetry, scenario selection, and the explicitly separate override. [scenarioSimulator.js](../src/features/monitoring/scenarioSimulator.js) samples deterministic telemetry from elapsed time without scheduling timers. [useMonitoring.js](../src/features/monitoring/useMonitoring.js) owns one 100 ms subscription, using `performance.now()` for every update and command. A visibility-change listener resynchronizes on return to the tab. Both are cleaned up on unmount. Switching scenarios replaces a single timeline; there are no old scenario callbacks to fire later. The existing clock/stopwatch subscription is independent.

[CentralAlert.jsx](../src/features/monitoring/CentralAlert.jsx) owns only alert presentation. The existing visor geometry, default typography, background, glow and telemetry positions remain unchanged. Amber/red styling applies only during active alerts. For three-digit HR readings, the opening ECG segment is clipped to keep the unit legible without moving or resizing the reading. [DeveloperControls.jsx](../src/features/monitoring/DeveloperControls.jsx) exposes controls, validated baseline settings and live status outside the helmet.

Readings are simulated, held between samples, and stored only in memory. The engine assumes the last simulated reading persists between evaluations. Normal browser scheduling resolves transitions on the next 100 ms update; throttled callbacks catch up using elapsed timestamps. There is no sensor quality pipeline, clinical validation, persistence, or backend integration.

## Verification

- `npm test`: 139 passing tests, including threshold equality, HR-only false-positive prevention, exact 3/5-second boundaries, recovery/interruption, custom and invalid baselines, overrides, scenario switching, manual input, and subscription cleanup.
- `npm run build` and `npm run lint`: pass.
- Browser checks confirmed both alert colours, one central alert at a time, zero-pixel centre offset, and the developer panel below the visor. Scenario 3 reached CRITICAL with elevated-HR evidence; Scenario 4 reached 120 BPM with NORMAL state and no alert.
- A 1920 × 1080 before/after NORMAL comparison sampled 120,652 static pixels outside the clocks and animated waveforms: zero changed pixels.

[Original NORMAL reference](helmet-hud-1920.png) · [Current NORMAL](helmet-normal-monitoring-1920.png) · [WARNING](helmet-warning.png) · [CRITICAL](helmet-critical.png)
