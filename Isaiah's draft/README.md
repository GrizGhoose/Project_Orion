# Project_Orion: Crew Health

**NASA Space Apps Challenge 2026 · Acute work incidents during EVA**

A helmet HUD and a habitat tablet that detect **hypoxia** during a lunar spacewalk, alert both the astronaut and the crewmate inside, and walk that crewmate through first aid and a **decompression sickness (DCS)** check step by step. Every decision is made by deterministic, explainable rules tuned on NASA and analog physiology data. No AI model is involved.

---

## Project Summary

### The problem

On the Moon, an EVA crewmember can be minutes from help, and mission control is a few seconds away by radio. For the crewmember inside (the IV crew), that is too slow to rely on during an emergency. **Hypoxia is especially dangerous because the person affected usually doesn't notice it.**

- **Symptoms:** judgement, vision and reaction time get worse before the astronaut feels unwell.
- **Real precedent:** spacewalk logs include real suit oxygen faults, such as the Orlan O₂ problem on ISS Increment 9 in 2004.
- **Detection gap:** today's suit displays and telemetry focus on the suit (pressure, O₂ supply, battery). No display in front of the astronaut or their crewmate turns the body's own signals into a clear "you are becoming hypoxic" warning.
- **DCS risk:** lunar EVAs move between a habitat at 8.2 psia and a suit at 4.3 psia. After an EVA, the crewmate may also need to recognise and treat DCS, without a doctor in the room.

### Our solution

Two connected displays and a wearable sensor:

1. **Helmet HUD (astronaut).**
   - **Readings:** SpO₂, heart rate, breathing rate, O₂ reserve and EVA time in the visor, kept clear of the centre of view.
   - **Alerts:** SpO₂-based WARNING and CRITICAL alerts appear at the centre of the visor ("Oxygen saturation low · Stop EVA activity").
2. **Crew Health tablet (habitat crewmate, 13" iPad Pro).**
   - **Monitoring:** both spacewalkers' vitals, live trend charts against each person's own baseline, and caution/warning alarms with tones and voice.
   - **Hypoxia response:** a step-by-step flow from confirming the problem, through emergency O₂, getting the crewmate inside and first aid, to hand-off to the flight surgeon.
   - **DCS check:** classifies symptoms by severity and estimates how likely each treatment option is to resolve them, using **NASA's DCS treatment model**.
   - **Event log:** every alert and step is logged, and the log exports as a hand-off report.
3. **Sensor node.** An **ESP32 + MAX30102** pulse oximeter sends live SpO₂ and heart rate over Wi-Fi to both displays, which read it independently.

**How detection works.**
- **Personal baseline:** each astronaut's normal is learned in the first 4 minutes (mean and SD).
- **Depth and duration:** an alert fires only when SpO₂ falls far enough **and** stays down long enough. Caution is at −2 SD for 5 s; warning is at −3 SD for 3 s, or below the 90 % / 85 % floors.
- **No false alarms from spikes:** a single noisy reading never alarms.
- **Startle filter:** a heart-rate spike while SpO₂ holds (startle or exertion) is shown as an advisory, not a hypoxia alarm.

### Impact

- **Earlier detection** of a condition the victim can't sense. On a recorded hypobaric climb, our detector raised a caution at SpO₂ ≈ 94 % and a warning at ≈ 92 %. That's well before the low-80s levels where reaction checks start to fail.
- **Fewer false alarms:** on NASA's startle-session data the detector never raises a hypoxia alarm, so alarms stay credible.
- **Any crewmate can respond:** large multiple-choice steps, pictures, timers and a progress line guide a non-medical crewmate under stress, with every step logged for the flight surgeon.
- **Built for limited bandwidth and no internet:** it runs locally on the habitat network, needs no internet, and uses no AI model that could make things up in an emergency.
- **Fits future missions:** the same design applies to Artemis surface EVAs and longer missions where help is further away.

---

## Project Details

### Approach

1. **Understand the user.** We went deep on one threat, hypoxia, rather than shallow on many. We designed for two people: the astronaut, who needs few words, the centre of view kept clear and big alerts, and the IV crewmate, who needs guidance, context and a record.
2. **Ground every number in data.** We built a data pack (`HYPOXIA/`) from NASA open data plus one analog dataset where NASA has no open data (SpO₂).
3. **Detector.** The detector is deviation-duration logic on a personal baseline, with clinical floors and a startle filter:
   - **Tuned and tested:** its timing was tuned and regression-tested on the recorded data.
   - **One rulebook, two places:** the same logic runs in Python on the tablet server and in TypeScript for the browser-only demo, and both produce identical alert timings.
4. **Response protocols as data.** The hypoxia and DCS flows are JSON decision trees, so a medic can review them without reading code.
   - **Sources:** each step can show its source, such as a NASA evidence-report finding with its page number.
   - **DCS odds:** the DCS check runs NASA's published treatment model.
5. **Test like it's an emergency.** Over 40 scenarios were run end to end in a headless browser: alarms, sound, every response branch, two crewmembers at once, reloads, a server crash, offline use, and layout at 13" iPad and laptop sizes.
6. **Two builds:**

   | Build | Folders | Data source | Purpose |
   |---|---|---|---|
   | **Demo** | `tablet/`, `astronaut-eva-hud/` | Recorded data replay, with HUD and tablet in sync | Reliable pitch backup |
   | **Hardware** | `tablet-hardware/`, `astronaut-eva-hud-hardware/` | Live ESP32 + MAX30102 | Real sensor input |

   - **Demo build:** a sudden SpO₂ drop can't be produced safely on stage, so the recorded replay is how a full hypoxia event gets shown.
   - **Hardware build:** the tablet has **MAX** (live sensor) and **NASA** (dataset replay) tabs, each with its own baseline. Only MAX drives alarms.

### Tools and technologies

| Area | Tools |
|---|---|
| Tablet backend | Python 3.13, FastAPI, Uvicorn, WebSockets, pytest |
| Tablet frontend | React 18, TypeScript, Vite; installable offline app; Web Audio tones and built-in speech for alerts |
| Helmet HUD | React 19, Vite, Tailwind CSS, Zustand, SVG visor graphics, Vitest, ESLint, Prettier |
| Hardware | ESP32 dev board, MAX30102 pulse oximeter (I²C), Arduino: SparkFun MAX3010x library (Maxim SpO₂ algorithm) and arduinoWebSockets |
| Data processing | Python (pandas, NumPy, SciPy): ECG R-peak detection, HRV (RMSSD), ECG-derived breathing rate, per-subject baselines |
| Hosting and testing | Vercel (browser-only demo build), headless Chrome scripting for end-to-end scenario tests |
| Design | Chakra Petch / IBM Plex fonts, NASA blue/red palette, NASA caution/warning colour conventions, a custom mission patch (not the NASA insignia) |

### NASA datasets and how we used them

| Dataset | Source | How we used it |
|---|---|---|
| **Flight Crew Physiological Data for Crew State Monitoring** | [data.nasa.gov](https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring) | We extracted heart rate, HRV and ECG-derived breathing rate per second from the raw 256 Hz ECG and respiration signals of 18 pilots, with labelled **startle** events. This tunes and proves the **startle filter**: HR spikes with steady SpO₂ never raise a hypoxia alarm. It is also EV2's heart-rate/HRV/breathing feed in the demo and on the NASA tab, and part of the automated tests. |
| **Extra-vehicular Activity (EVA) – US and Russia** | [data.nasa.gov](https://data.nasa.gov/dataset/extra-vehicular-activity-eva-us-and-russia) | 375 EVAs from 1965 to 2013. We filtered 44 with crew or suit problems: helmet fogging, O₂ failures, cooling, water in the helmet. These ground the demo scenario (a suit O₂ regulator fault, modelled on the 2004 Orlan O₂ incident) and the pitch. |
| **Risk of Hypobaric Hypoxia from the Exploration Atmosphere** (evidence report) | [NASA NTRS 20150021491](https://ntrs.nasa.gov/citations/20150021491) | We extracted 14 findings with page numbers: symptoms, vision and performance effects, countermeasures. They appear as "Why this step" notes in the hypoxia response. The habitat and suit pressures (8.2 psia / 34 % O₂, 4.3 psia suit) set the suit-pressure checks and the O₂-equivalent altitude shown on the tablet. |
| **Hypoxia Risk DAG** (narrative and code) | [NASA Human Research Program](https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/) | 33 causes, countermeasures and outcomes, with 55 links. We used them to map causes (suit O₂ fault, exertion) to countermeasures (emergency O₂, rest, return to the airlock) when designing the response flow. |
| **Hypobaric Decompression Sickness Treatment Model** | NASA TP-2014-218561 | The DCS check runs NASA's regression model for P(symptom resolution), which depends on treatment pressure, walking during the EVA and when the symptom started. It shows, for example, the odds of resolution back in the habitat against using the Bends Treatment Apparatus (BTA). Our version reproduces the report's Mars EVA example (0.51 against the published 0.49). The DCS classification and treatment steps (Type I / Type II, 100 % O₂, fluids, BTA at 8.0 psid) follow the same report. |

**Analog dataset (not NASA).** NASA publishes no open SpO₂ data, so SpO₂ comes from **Harespod**: Yang et al., *Scientific Data* 2024 ([paper](https://www.nature.com/articles/s41597-024-03065-x)). It follows 15 adults in a hypobaric chamber from 1,500 m to over 4,000 m.
- **How we used it:** it sets and validates the detector's caution and warning timing, and drives EV1's hypoxia event in the demo and on the NASA tab.
- **Caveat:** Harespod publishes SpO₂ scaled per person, so the displayed percentages use an assumed mapping (75–99 %). We state this wherever it matters.

**What the data does in each build:**
- **Demo build:** the datasets are the replayed telemetry.
- **Hardware build:** live MAX30102 readings drive the alarms. The datasets serve as the **benchmark** that the thresholds and startle filter were tuned and tested on. They also power the view-only **NASA** tab, and the evidence and DCS model behind the response flows.

### Repository layout

| Path | Contents |
|---|---|
| `tablet/` | Crew Health tablet, demo build: recorded data replay, port 8000; browser-only build hosted on Vercel |
| `astronaut-eva-hud/` | Helmet HUD, demo build, synced to the demo tablet, port 5173 |
| `tablet-hardware/` | Tablet reading live ESP32 sensors, with MAX and NASA tabs, port 8100 |
| `astronaut-eva-hud-hardware/` | HUD reading the ESP32 directly, port 5174 |
| `hardware/esp32_crewhealth/` | ESP32 + MAX30102 sketch, wiring and message format |
| `HYPOXIA/` | Data pack: NASA and analog datasets, sources, and the build script |

Each folder has its own README with run instructions.

### Limitations

- **Concept prototype, not a medical device.** The first-aid steps follow standard first aid and NASA's published DCS treatment, but have **not** been reviewed by a flight surgeon. The MAX30102 is a hobby-grade sensor.
- **Suit telemetry is simulated.** Suit pressure and O₂-equivalent altitude in the demo are modelled from NASA atmosphere specifications, not recorded from a suit.
- **Thresholds are prototype values.** They were tuned on a small number of recorded subjects and would need clinical validation before use.
