# Synchronized Scenario 3 demo

Run commands from the H.E.R workspace root. Requires Node.js 22+ and each app's existing npm dependencies. No Python data pack, additional npm packages, or internet connection is needed during the presentation.

## Build and launch

```powershell
npm.cmd --prefix apps/astronaut-eva-hud-ZX ci
npm.cmd --prefix apps/tablet/frontend ci
node demo/build.mjs
node demo/server.mjs
```

Open both interfaces with synchronization enabled:

- HUD: <http://localhost:8080/hud/?sync=1>
- Tablet: <http://localhost:8080/tablet/?sync=1>

For separate devices replace localhost with the server computer's LAN IPv4 address. Allow inbound TCP 8080 on the host and keep its terminal running. The server binds to 0.0.0.0; PORT overrides 8080. Prevent the host from sleeping during the demo.

The first /sync/events connection initializes the shared session and establishes time zero automatically. No Start button is required. The tablet opens directly into monitoring. Browser audio/fullscreen permissions still require a gesture; visual alerts are automatic.

## Physiological progression

The server starts the existing **Scenario 3 (combined SpO2 deterioration and elevated heart rate)** at exactly 15,000 ms of authoritative elapsed time. It imports the same [monitoring reducer](../apps/astronaut-eva-hud-ZX/src/features/monitoring/monitoringState.js), [scenario sampler](../apps/astronaut-eva-hud-ZX/src/features/monitoring/scenarioSimulator.js) and [alert engine](../apps/astronaut-eva-hud-ZX/src/features/monitoring/alertEngine.js) used in manual mode. There are no scheduled Warning/Critical UI commands, altered production thresholds, or compressed physiological timings.

Scenario 3's original behavior is two seconds of baseline, a two-second ramp, then held readings. SpO2 ramps from 98% to 92%; heart rate ramps from 72 to 120 BPM. Respiration stays 16/min and oxygen reserve 85%. SpO2 must be strictly below its personal mean minus three SD (98 - 3 * 1 = 95%). Warning requires three continuous seconds below that gate; Critical requires five. Heart rate supports the alert message but does not gate severity.

At the existing manual hook's 100 ms sampling cadence, the expected shared progression is:

| Shared elapsed time | Scenario / physiology | EV1 state |
| --- | --- | --- |
| 0-14.99 s | Normal baseline; no active scenario | Normal |
| 15.00 s | Scenario 3 starts | Normal |
| 15-17 s | Scenario 3's original baseline hold | Normal |
| 17.1-19 s | Original SpO2/HR ramp | Normal |
| 18.00 s | SpO2 95%, HR 96; exactly at the gate | Normal |
| 18.10 s | First sampled SpO2 below 95% | Normal; breach timer starts |
| 19.00 s onward | SpO2 92%, HR 120 | Detection continues |
| 21.10 s | Three-second SpO2 breach | Warning |
| 23.10 s | Five-second SpO2 breach | Critical |
| Successful final Finish | Shared incident resolved, baseline readings restored | Normal |

**Warning at 18 s and Critical at 20 s would not match the existing Scenario 3.** The latest behavior preserves the unmodified physiological progression instead. Scenario activation is the only scheduled event; the existing detector determines both severity changes. The exact logical sample times above are tested. Network delivery and browser repaint add latency.

EV2 stays physiologically Normal. Switching the HUD POV to EV2 shows the existing buddy Warning/Critical distress notification when EV1 is affected. Existing elevated-HR messages, alert colors, emergency instructions, buddy locator and tablet response layout are retained. Tablet baseline, gate and duration displays reflect the shared Scenario 3 detector rather than its separate manual backend detector.

## Communication and resolution

[server.mjs](./server.mjs) serves both builds and broadcasts complete snapshots over Server-Sent Events. [session.mjs](./session.mjs) owns one monotonic server timeline and a single authoritative monitoring state. It evaluates deterministic 100 ms samples and catches up missed samples before publishing. Snapshots are sent every 50 ms and at the 15-second start deadline. Refreshing, reconnecting, or opening late adopts the existing session; clients run no demo timers or independent detectors.

The incident lifecycle is Normal -> Warning -> Critical, with RESPONSE_IN_PROGRESS allowed from either Warning or Critical. Starting a response retains the detector's current severity and does not prevent further escalation. Escalation clears an earlier acknowledgement so the higher alert is announced. The simulated source and Scenario 3 detector are identified explicitly; these are not real sensor measurements.

The tablet's existing final **Finish** action saves its final protocol node and posts completion to the shared resolve API with the demo-session and incident IDs. The server validates a completed protocol path, transitions through RESOLVED to NORMAL, and immediately broadcasts the update. Both displays restore baseline readings and clear emergency and buddy alerts. Acknowledging, opening, treating, or merely reaching an end node does not resolve the incident. Duplicate completions are idempotent, and delayed commands from an earlier replay are rejected. Failed completion requests retain the workflow for retry.

Resolution stops the scenario and preserves its one-shot activation flag. Neither Warning nor Critical can retrigger until an explicit reset or server restart. Resolution survives page refreshes and reconnects for the lifetime of the server process. Completing EV2 or DCS workflows does not resolve EV1. Unsynchronized response behavior remains unchanged.

## Reset and replay

On the server computer open <http://localhost:8080/sync/reset>. GET immediately resets the shared timeline and returns **Demo reset successfully**, with HUD/tablet links carrying ?sync=1. This shortcut is limited to direct loopback development requests and disabled with NODE_ENV=production. External peers/Host names, forwarded or cross-origin requests and browser prefetches receive 403 without mutation. Use port 8080 directly rather than a Vite/reverse proxy.

POST remains available, including for LAN clients, and returns JSON containing ok and the new sessionId:

```powershell
Invoke-RestMethod -Method Post http://localhost:8080/sync/reset
```

GET and POST invoke the same reset function. Both connected interfaces return to Normal, response sessions/logs are cleared, and Scenario 3 starts 15 seconds into the new timeline. The server process owns the session; restarting it creates a new session on the first connection.

## Manual mode and development

Use ?sync=0 for the HUD's original developer controls and ?sync=0&start=1 for the tablet's original manual simulation in the demo production build. Both detectors' production thresholds and manual scenarios are unchanged. The synchronized mode owns its fixed Scenario 3 sequence; manual scenario and speed controls remain available outside it.

For development run this server and both existing Vite dev servers on distinct ports. Their /sync proxies target port 8080; append ?sync=1 to each Vite URL. The original Python tablet workflow remains available independently.

## Verification

```powershell
node --test demo/session.test.mjs demo/resetAccess.test.mjs demo/transport.test.mjs
npm.cmd --prefix apps/astronaut-eva-hud-ZX test
npm.cmd --prefix apps/astronaut-eva-hud-ZX run lint
node demo/build.mjs
```

Unit tests compare every telemetry and detector field to manual Scenario 3 at each 100 ms step, verify exact activation and natural severity boundaries, catch-up, response during Warning, escalation, resolution and no retrigger. HUD tests verify Warning/Critical rendering, elevated HR, both buddy alerts and clearing on resolution. Real HTTP/SSE tests run the full progression for both GET and POST reset, late connections, response completion, reconnects, replay and local GET access restrictions. The network tests take about 52 seconds.

## Files modified for Scenario 3

- [session.mjs](./session.mjs): shared Scenario 3 reducer, deterministic sampling/catch-up, Warning-capable lifecycle and tablet physiology adapter.
- [server.mjs](./server.mjs): 15-second activation deadline, shared threshold metadata and reset confirmation text.
- HUD [crewState.js](../apps/astronaut-eva-hud-ZX/src/features/monitoring/crewState.js): renders the server's detector state instead of a visual override.
- HUD [monitoringState.js](../apps/astronaut-eva-hud-ZX/src/features/monitoring/monitoringState.js), [alertEngine.js](../apps/astronaut-eva-hud-ZX/src/features/monitoring/alertEngine.js), [scenarioSimulator.js](../apps/astronaut-eva-hud-ZX/src/features/monitoring/scenarioSimulator.js): explicit .js imports for native Node reuse; scripted control-mode label updated. Detection and sampling logic are unchanged.
- Tablet [types.ts](../apps/tablet/frontend/src/types.ts), [CrewCard.tsx](../apps/tablet/frontend/src/components/CrewCard.tsx), [TrendChart.tsx](../apps/tablet/frontend/src/components/TrendChart.tsx), [SimPanel.tsx](../apps/tablet/frontend/src/components/SimPanel.tsx): Warning lifecycle type and accurate shared gate/duration/provenance labels within the existing layout.
- [session.test.mjs](./session.test.mjs), [transport.test.mjs](./transport.test.mjs), HUD [demoSync.test.jsx](../apps/astronaut-eva-hud-ZX/src/features/monitoring/demoSync.test.jsx): updated progression, parity, rendering and resolution coverage.
- This README. Both ignored production build directories are regenerated. Dependency manifests are unchanged.
