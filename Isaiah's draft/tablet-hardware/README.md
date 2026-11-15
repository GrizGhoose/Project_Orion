# Crew Health: IV crew tablet (hardware version)

> **This copy reads live sensors** (an ESP32 + MAX30102 per crewmember, see `../hardware/esp32_crewhealth`) and runs on **port 8100**. The recorded replay, mission clock and SIM controls are removed. The original `tablet/` folder keeps the replay as the demo backup on port 8000.
>
> - **Sensor addresses:** `backend/app/config.py` → `SENSOR_URLS`, or the `EV1_SENSOR_WS` / `EV2_SENSOR_WS` env vars. A board can also `POST` the same JSON to `/api/ingest/{crew}`.
> - **One second = one detector step** with each sensor's latest reading. Readings older than 3 s count as no signal.
> - **No sensor:** breathing, HRV, suit pressure, O₂-equivalent altitude and reaction time show "No sensor" unless a board sends them. A crewmember without a board shows "Sensor offline" and stays in baseline.
> - **Monitor tabs:**
>   - **MAX:** the live MAX30102 readings, with each person's baseline from their first 4 min. This feed drives all alarms, sound and the response flow.
>   - **NASA:** the recorded NASA/analog data (EV1: analog Harespod SpO₂ climb; EV2: NASA crew-state startle session), replayed as a separate, view-only feed with its own baseline from the first 4 min of the recording. It plays at `NASA_REPLAY_SPEED` (default 5×, set in `backend/app/config.py` or as an env var) and loops.
> - **SENSORS panel** (top right): connection status per board, **Restart baseline**, **Restart NASA replay**, sound.
> - **Kept unchanged:** the detector, alerts, response flows, DCS check, log and sessions. The NASA/analog replays stay in `backend/tests/` as the validation evidence for the thresholds.
>
> Sections below that mention the replay, the scenarios, Vercel or `export_demo.py` describe the original version.


The crewmember inside the habitat (IV crew) uses this tablet during a lunar EVA. It shows both spacewalkers' vitals live, sounds and speaks an alert when either one becomes hypoxic, and walks the crewmember through first aid with multiple-choice steps. A DCS check (decompression sickness) can be opened at any time.

It is designed for the 13" iPad Pro (M4) in landscape: 2752 × 2064 px, shown as 1376 × 1032 pt, 4:3.

- **The app fills the whole window**, keeping the iPad's proportions as a minimum and widening on 16:9 or 16:10 screens instead of showing black bars. The charts resize with it.
- **Full-screen mode** starts when you tap **Begin monitoring**, and the ⛶ button in the status bar toggles it. On the iPad, *Add to Home Screen* opens the app without browser bars.
- **`?frame=1`** draws the iPad bezel around the app, for pitch screenshots. In a desktop browser it shows inside a tablet frame. Added to an iPad home screen, it runs full screen and keeps working offline.

## Run it

```bash
./run.sh          # builds the app if needed, starts the backend, open http://localhost:8000
```

Or by hand:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd ../frontend && npm install && npm run build
cd ../backend && .venv/bin/uvicorn app.server:app --port 8000
```

To work on the UI with hot reload, run `npm run dev` in `frontend/` while the backend runs; Vite forwards `/api` and `/ws` to port 8000.
To open on an iPad, connect it to the same Wi-Fi and go to `http://<laptop-ip>:8000/?bare=1`, then Share → Add to Home Screen.

Backend tests: `cd backend && .venv/bin/python -m pytest -q`

## Hosted version (Vercel)

**Live: https://crew-health-tablet.vercel.app**

- **How it runs:** Vercel can't run the Python server (it needs an always-on mission clock and WebSockets). So the hosted build runs a TypeScript port of the detector and mission sim in the browser (`frontend/src/demo/`). It reads one data file, `frontend/public/demo/data.json`, made by `backend/export_demo.py`.
- **Checked against Python:** both versions raise EV1's caution and warning at the same seconds (799 s and 1211 s).
- **What's different:** each device runs its own copy, so tablets don't sync. Progress is saved in the browser, so a reload resumes the response.
- **Redeploy after changes:**

  ```bash
  cd backend && .venv/bin/python export_demo.py            # only if streams, protocols or thresholds changed
  cd ../frontend && npx vercel@65.16.0 deploy --prod
  ```

  Vercel runs `npm run build:demo` from `vercel.json`. Pushes to GitHub don't redeploy it, because the Vercel project isn't connected to the repo.

## How the detector works

Each spacewalker gets a **personal baseline**: the mean and standard deviation (SD) of their SpO₂ over the first 4 minutes, before the EVA. After that, every second:

```
z = (5-second median SpO₂ − baseline mean) / baseline SD        SD has a floor of 1.5 points (oximeter accuracy)
```

The detector times how long z stays below each line. A reading has to be both far enough below the mean and stay there long enough, so a single noisy value never sets off an alarm.

| Level | Rule |
|---|---|
| Caution | z ≤ −2 for 5 s, or SpO₂ < 93 % for 5 s |
| Warning | z ≤ −3 for 3 s, or SpO₂ < 90 % for 3 s, or SpO₂ < 85 % for 3 s |
| Advisory | HR ≥ 2 SD above baseline while SpO₂ holds (z > −1): startle or exertion, no hypoxia alarm |
| Clear | An alert stays on until z > −1 and SpO₂ ≥ 93 % for 20 s in a row |

Each timer tolerates up to 5 s back above its line before it resets. Every threshold lives in `backend/app/config.py`.

The holds are short because this is an emergency tool. The 5-second median already removes single-sample spikes, so a 2 s spike is ignored. The trade-off is that a dip lasting about 8 s, such as a slipped sensor, does raise a caution. That case is what the "False alarm" end reason is for.

On the demo data, EV1 reaches **caution at 13:19 MET** (SpO₂ 94 %) and **warning at 20:11 MET** (92 %). EV2's startles raise advisories and never an alarm.

## Alerts

| Level | Tone | Voice |
|---|---|---|
| Caution | Two-tone chime every 5 s | "Caution. E V 1. Oxygen saturation 93 percent, below baseline." |
| Warning | Fast warble every 3 s, banner flashes | "Warning. E V 1, hypoxia. Oxygen saturation 88 percent. Start hypoxia response." |
| Advisory | One soft chime, at most once a minute | None |

The tone keeps repeating and the voice repeats every 30 s until someone taps **Acknowledge**. If the alert gets worse, the alarm starts again. The voice uses the iPad's built-in offline speech, not an AI model.

**How an alert clears:**
- **The response works.** Confirming the emergency-O₂ step or the O₂ mask step switches the simulated vitals onto a recovery curve. Suit pressure is restored within seconds, and SpO₂ returns to baseline over about a minute. The detector then clears the alert itself.
- **The crew ends the response.** **End response** asks for a reason, which is logged:
  - *Vitals stable:* clears the alert now.
  - *False alarm:* clears it, but if SpO₂ is still low the alarm returns after the usual hold time.
  - *Flight surgeon took over:* leaves the alert on.
- **Finishing the whole flow** resolves the alert.

## Response flows (`backend/protocols/*.json`)

The decision trees are stored as data, so a medic can review them without reading any code.

- **Hypoxia response.** Five phases: confirm → stabilise outside → bring inside → first aid → monitor & hand off.
  - Steps are multiple-choice questions (answer A/B/C) or checklists with timers.
  - The live SpO₂, baseline and suit pressure are filled into the prompts.
  - Every answer is written to the log.
- **DCS check** (opened manually, or linked from the hypoxia flow).
  - Asks when symptoms started and how many minutes into the EVA.
  - Uses a symptom grid to classify the case as Type I, cutis marmorata (marbled skin) or Type II.
  - Treatment then follows NASA's steps: 100 % O₂, rest and fluids, then the Bends Treatment Apparatus (BTA) at 8.0 psid over cabin pressure.
  - It runs **NASA's DCS treatment model** to show how likely each treatment option is to resolve the symptoms.
- **Log & hand-off.** A timestamped record of alerts, acknowledgements and every step taken, plus a summary for the flight surgeon that can be downloaded.

## Look and feel

- **Fonts:** **Chakra Petch** (angular and technical) for headings, buttons, option labels and step codes; **IBM Plex Sans** for reading text; **IBM Plex Mono** for numbers and data labels. They are bundled with the app (`@fontsource`), so they also work offline. We picked them to look like engineering hardware and to stand apart from typical web apps. They keep the NASA colour palette.
- **Cockpit-key options:** each answer is a hardware-style key with a lettered block coloured by severity, a label in capitals, a "NEXT →" strip naming the step that answer leads to, and an indicator light that turns on when the option is selected. Cards and buttons have cut corners. Steps are coded Q.01 (question) or S.02 (action step), with a phase tag.
- **Step pictures** (`frontend/src/components/Illustrations.tsx`) are line drawings shown beside the options. They cover: O₂ mask, pulse oximeter, recovery position, CPR, suit pressure gauge, emergency O₂ control, buddy check, airlock repress, helmet removal, DCS body map, and the Bends Treatment Apparatus (BTA).
  - The gauge, the oximeter and the O₂ control show live values.
  - The body map highlights the symptoms that are ticked.
  - Each step's picture is set by the `image` field of that step in `backend/protocols/*.json`.
  - The suit controls are drawn as a generic layout, not a real suit's panel.

## Where each number comes from

| Signal | Source |
|---|---|
| SpO₂ | Harespod hypobaric chamber dataset (analog, *Sci Data* 2024). Values are scaled 0–1 per person; shown here as 75–99 %. **Assumed mapping.** |
| HR | EV1: Harespod (scaled, shown as 55–125 bpm). EV2: NASA Flight Crew Physiological Data (from ECG). |
| HRV, breathing rate | NASA Flight Crew Physiological Data for Crew State Monitoring (from ECG) |
| EV2 startle events | NASA crew-state startle session, subject 14 (`demo_replay_startle.csv`) |
| Suit pressure, O₂ equivalent altitude | Simulated: nominal suit 4.3 psia, 100 % O₂ (NASA evidence report). During the fault, suit pressure is set so the lungs get the same O₂ as the Harespod subject's chamber altitude. |
| Reaction check | Simulated here; measured live by the helmet HUD |
| Protocol "why" notes | NASA hypoxia evidence report (NTRS 20150021491), loaded from `nasa_hypoxia_evidence_facts.csv` with page numbers |
| DCS probabilities | NASA TP-2014-218561 (Conkin et al.): P = 1/(1+exp(−(ln ΔP − 1.510 + 0.795·AMB − 0.00308·Ts)/0.478)). Our version uses the raw pressure difference, which reproduces NASA's Mars case: 0.51 vs NASA's 0.49. |

## Limits (say these before a judge asks)

- **First-aid steps are concept content** based on standard first aid and NASA's published DCS treatment. They are not NASA flight procedures and have not been reviewed by a flight surgeon.
- **The SpO₂ percentages come from an assumed mapping**, because Harespod publishes scaled values, not percentages.
- **The suit fault is modelled, not recorded.** The demo story is an O₂ regulator fault, inspired by the 2004 Orlan O₂ incident in `nasa_eva_suit_incidents.csv`.

## Files

```
backend/app/config.py      thresholds, crew, scenarios
backend/app/streams.py     builds per-second streams from ../HYPOXIA
backend/app/detector.py    deviation-duration detector
backend/app/dcs_model.py   NASA DCS treatment model
backend/app/sim.py         mission clock, alert log
backend/app/server.py      FastAPI: /ws, /api/config, /api/protocols/{id}, /api/dcs/options, /api/sim, /api/ack, /api/log
backend/protocols/         hypoxia.json, dcs.json
frontend/src/              React + TypeScript app (App.tsx, components/, audio.ts)
```

The **SIM** pill in the status bar opens the presenter controls: scenario, speed (1–20×), pause, mute, and the data source behind each signal.
