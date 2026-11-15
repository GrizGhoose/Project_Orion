# Lunar EVA Helmet HUD

An astronaut helmet display for the NASA Space Apps Challenge, with a preserved NORMAL visor, SpO₂-gated WARNING/CRITICAL states, and a separate developer panel below the HUD. Earlier simulation, health, routing, and control modules are retained as inactive source files; the current app does not import them.

## Run

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

In Windows PowerShell, use `npm.cmd` if script policy blocks `npm.ps1`. Both `/` and `/helmet` display the HUD through Vite's SPA fallback.

## Current display

- Live local mission clock in HH:MM:SS.
- Automatically started EVA stopwatch based on monotonic `performance.now()` timestamps, including after background-tab throttling. Reloading starts a new EVA.
- Simulated respiration (16 breaths/min), heart rate (72 BPM), SpO₂ (98%), and oxygen reserve (85%).
- A 1920 × 1080 SVG projection with curved telemetry rails, a shallow timer recess, elliptical side boundaries, breathing/ECG traces, and segmented oxygen reserve.
- Separate full-screen lunar background, glass shading, diffuse white peripheral scattering, and faint optical reflections. The centre and lower viewing field remain open in NORMAL; active alerts appear at the exact visor centre.

The background uses CSS `background-size: cover`; the SVG scales with the viewport. Desktop 16:9 is the visual reference. Waveform animations respect reduced-motion preferences. All fonts and images are served locally; there are no runtime API calls or backend integrations.

Implementation: [HUD components](src/features/visor/HelmetHUD.jsx), [central simulated configuration](src/features/visor/config.js), and [visual styles](src/styles/index.css).

## Physiological monitoring

Scroll below the helmet for manual alert triggers, four automated scenarios, live telemetry inputs, baseline configuration, and detection status. Defaults: SpO₂ threshold 95%, WARNING after 3 continuous seconds below threshold, CRITICAL after 5 seconds total, and recovery after 3 continuous normal seconds. Heart rate is supporting evidence only. [Implementation, controls, assumptions, and verification](docs/monitoring.md).

## Validation

Production build and ESLint pass. All 166 tests pass, covering detection boundaries, recovery, heart-rate-only false-positive prevention, overrides, scenario switching, developer inputs, and timer cleanup. Existing legacy-module tests remain in the suite.

The HUD was visually inspected and refined in headless Chrome at 1920 × 1080. [Final screenshot](docs/helmet-hud-1920.png).

## Dual astronaut POV and buddy distress

The default perspective is EV1, tracking EV2. Switching to EV2 shows EV2's own telemetry and distress while the locator tracks EV1. Each astronaut has independent readings, baselines, automatic detection/recovery timers, scenario timeline, and manual distress override. Switching POV preserves all of these, the EVA stopwatch, and the existing locator motion/distance timeline.

Scroll below the visor to **Astronaut perspectives & distress · simulated**. Select **View EV1** or **View EV2**, and use the separate **EV1/EV2 Normal, Warning, Critical** buttons to set distress. Warning/Critical reuse the existing latched demo overrides and representative low SpO₂ reading. Normal resets only the targeted astronaut. The existing scenario, baseline, live-telemetry and generic reset controls apply to the currently selected POV. Both astronauts continue updating through a single 100 ms monitoring subscription, even when off-screen; the original per-astronaut SpO₂ gate, HR supporting-evidence rule and recovery logic are unchanged.

The locator displays the tracked ID (`EV1`/`EV2`) and its own blue/amber/red distress colour. It stays inside the right-hand curve in EV1 POV and the left-hand curve in EV2 POV and retains its continuously visible 30–45 m distance, initially 38 m. Movement and distance use separate smoothly interpolated, bounded random targets. This simulation is illustrative, not real relative-position telemetry.

Buddy WARNING/CRITICAL displays the existing central alert with heading **WARNING**/**CRITICAL** and supporting message **BUDDY IN DISTRESS**. Its accessible name is exactly `WARNING | BUDDY IN DISTRESS` or `CRITICAL | BUDDY IN DISTRESS`. The notification persists until buddy recovery/reset or a higher-priority own alert. Own CRITICAL always wins; otherwise higher severity wins, with own alerts winning ties. Buddy messages do not alter own physiology, own visor/telemetry severity, or either detection engine. One central message is shown at a time. Buddy messages use the existing amber/red fade timings (1.2/0.8 seconds) and reduced-motion support, without the own-critical `STOP EVA ACTIVITY` instruction.

[crewState.js](src/features/monitoring/crewState.js) keeps the independent monitoring records and central-alert priority; [useCrewMonitoring.js](src/features/monitoring/useCrewMonitoring.js) owns the single crew subscription. State is in memory and resets on page reload. Per-astronaut distress overrides and generated physiology remain explicitly simulated.

The reusable [BuddyGeolocator](src/features/buddy/BuddyGeolocator.jsx) uses one cleaned-up `requestAnimationFrame` loop and direct SVG updates, with no per-frame React state updates. Its [demo source](src/features/buddy/buddySimulation.js) is separate from the [shared visor geometry](src/features/visor/visorGeometry.js). Relative direction is illustrative, based on simulated vertical bearing; this is not real geolocation or sensor telemetry. Reduced-motion preferences hold the marker position while distance continues updating.

Build, lint, and all 166 tests pass. Tests cover both POVs, independent distress/telemetry/baselines, off-screen automatic detection and recovery, all nine central severity-priority combinations, locator continuity through tracked-ID changes, and subscription cleanup. Existing geometry, motion bounds and primary physiological tests also pass. Browser checks confirmed own-versus-buddy messages, independent colours, preserved distance while switching POV, and reset/recovery behaviour.

## Local assets

[Moon environment](public/images/lunar-surface-wide.png) was generated with the built-in image generation tool. It is an illustrative photorealistic environment, not a NASA mission photograph. The supplied Hypergiant reference guided only the SVG visor composition; its Earth-orbit scene is not used.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: local fullscreen environment background for astronaut first-person helmet HUD, 16:9 wide landscape, ideally 3840x2160. Primary request: extraordinarily realistic photograph from astronaut eye height 1.75 meters standing on the Moon, looking horizontally across grey lunar regolith with scattered angular rocks, shallow impact craters and distant softly rounded lunar mountains. Horizon at 43 percent from top, upper 40 percent of image pure pitch-black empty sky. Natural hard sunlight from upper left, crisp long black shadows across granular silver-grey terrain, intricate regolith texture, realistic Apollo mission surface photography, neutral monochrome terrain with subtle warm sunlight. Open spacious central field, foreground rocks for depth, no dramatic giant foreground boulders. Constraints: no atmosphere, no atmospheric haze, no stars, no Earth, no planets, no spacecraft, no people or hands, no helmet framing, no UI, no text, no watermark. This is only the raw lunar environment; glass and HUD are implemented separately in code.

[Orbitron](public/fonts/orbitron-latin.ttf) is hosted locally under the [SIL Open Font License](public/fonts/OFL-Orbitron.txt), sourced from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/orbitron).
