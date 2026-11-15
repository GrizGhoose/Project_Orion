> **Live hardware mode:** The default entry point now reads the Raspberry Pi telemetry API. Setup: [Pi gateway](../../services/raspberry-pi-gateway/README.md) and [ESP32 firmware](../../firmware/esp32-vitals/README.md). The simulation described below remains available explicitly at `?demo=1`. Real baseline and alert calculations run on the ESP32; the live UI displays their results.

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

## Sensor link (hardware version)

> Historical WebSocket integration: the section below and its retained sensor-link module describe the earlier transport. The default entry point now uses the Pi HTTP API described at the top of this guide. The referenced `hardware/esp32_crewhealth` firmware is not present in this checkout. The current synchronized demonstration uses the separate [HUD application](../astronaut-eva-hud-ZX/README.md) and [demo server](../../demo/README.md).

This copy reads live data from an **ESP32 + MAX30102** (`../hardware/esp32_crewhealth`) instead of the Crew Health tablet. The current `apps/astronaut-eva-hud-ZX/` keeps the tablet-synced replay as the demo backup.

- **Readings:** SpO₂ and heart rate come from the board's WebSocket, `ws://crewhealth-ev1.local:81/` by default. Use `?sensor=ws://<ip>:81/` or `VITE_SENSOR_WS_URL` to point elsewhere. Respiration is used only if a board sends `rr`. O₂ reserve keeps its local value.
- **No signal:** readings flagged `"signal": false` (no finger) are ignored, so the HUD keeps its last good values.
- **Clocks and alerts:** the HUD's own. MISSION TIME is local time of day, EVA ELAPSED counts from page load, and the alert rules are in the developer panel (SpO₂ below the baseline mean − 3 SD for 3 s, then 5 s).
- **Running it:** `npm run dev -- --port 5174`. `VITE_SENSOR_LINK=off` runs the HUD without a board. The link code is in `src/services/telemetry/sensorLink.js`.

## Physiological monitoring

Scroll below the helmet for manual alert triggers, four automated scenarios, live telemetry inputs, baseline configuration, and detection status. Defaults: SpO₂ threshold 95%, WARNING after 3 continuous seconds below threshold, CRITICAL after 5 seconds total, and recovery after 3 continuous normal seconds. Heart rate is supporting evidence only. [Implementation, controls, assumptions, and verification](docs/monitoring.md).

## Validation

Production build and ESLint pass. All 139 tests pass, covering detection boundaries, recovery, heart-rate-only false-positive prevention, overrides, scenario switching, developer inputs, and timer cleanup. Existing legacy-module tests remain in the suite.

The HUD was visually inspected and refined in headless Chrome at 1920 × 1080. [Final screenshot](docs/helmet-hud-1920.png).

## Local assets

[Moon environment](public/images/lunar-surface-wide.png) was generated with the built-in image generation tool. It is an illustrative photorealistic environment, not a NASA mission photograph. The supplied Hypergiant reference guided only the SVG visor composition; its Earth-orbit scene is not used.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: local fullscreen environment background for astronaut first-person helmet HUD, 16:9 wide landscape, ideally 3840x2160. Primary request: extraordinarily realistic photograph from astronaut eye height 1.75 meters standing on the Moon, looking horizontally across grey lunar regolith with scattered angular rocks, shallow impact craters and distant softly rounded lunar mountains. Horizon at 43 percent from top, upper 40 percent of image pure pitch-black empty sky. Natural hard sunlight from upper left, crisp long black shadows across granular silver-grey terrain, intricate regolith texture, realistic Apollo mission surface photography, neutral monochrome terrain with subtle warm sunlight. Open spacious central field, foreground rocks for depth, no dramatic giant foreground boulders. Constraints: no atmosphere, no atmospheric haze, no stars, no Earth, no planets, no spacecraft, no people or hands, no helmet framing, no UI, no text, no watermark. This is only the raw lunar environment; glass and HUD are implemented separately in code.

[Orbitron](public/fonts/orbitron-latin.ttf) is hosted locally under the [SIL Open Font License](public/fonts/OFL-Orbitron.txt), sourced from the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/orbitron).
