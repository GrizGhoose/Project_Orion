# HYPOXIA data pack

Everything the team needs for the hypoxia-deep build: a HUD that detects hypoxia on a lunar EVA, tells it apart from startle, and escalates to the EVA buddy.
Files prefixed `nasa_` are NASA data. Files prefixed `analog_` are non-NASA data used alongside it, which the Space Apps rules allow.

## Datasets

| File | What it shows |
|---|---|
| `nasa_crew_state_ecg_resp_256hz.csv` | NASA raw physiology at 256 Hz (ECG, respiration) from 18 pilots, labelled baseline / channelized attention / diverted attention / startle. |
| `nasa_crew_state_features_1hz.csv` | The same NASA data processed to one row per second: **heart rate, HRV (RMSSD), breathing rate**, each also as a delta from the subject's own baseline, plus an `is_startle` label. Ready to train the startle-vs-hypoxia false-alarm filter. |
| `nasa_eva_log_us_russia.csv` | NASA log of all 375 US and Russian spacewalks, 1965–2013: crew, vehicle, date, duration and notes. |
| `nasa_eva_suit_incidents.csv` | 44 EVAs from that log whose notes describe a crew or suit problem (helmet fogging, O₂ failures, suit cooling, water in helmet), with incident-type tags. The scenarios for the demo come from here. |
| `nasa_hypoxia_risk_dag_nodes.csv` | NASA's hypoxia risk graph: 33 causes, countermeasures and outcomes, each with its category. |
| `nasa_hypoxia_risk_dag_edges.csv` | The 55 cause → effect links in that graph, with NASA's level of evidence. These become the structure of the triage logic. |
| `nasa_exploration_atmospheres.csv` | Cabin and suit atmospheres (ISS 14.7 psia, lunar habitat 8.2 psia / 34% O₂, suit 4.3 psia) with O₂ pressures and equivalent altitude, from the NASA evidence report. |
| `nasa_hypoxia_evidence_facts.csv` | 14 key findings from the NASA hypoxia evidence report (symptoms and how common they are, vision and performance effects, countermeasures), each with its page number. Use these for HUD copy and pitch claims. |
| `analog_harespod_vitals_1hz.csv` | Analog: **SpO₂, heart rate and pulse rate** each second from 15 adults in a hypobaric chamber taken from 1,500 to 4,000+ m. |
| `analog_harespod_waveforms_100hz.csv` | Analog: the same subjects' raw pulse-oximeter (PPG) and respiration waveforms at 100 Hz. |
| `analog_harespod_features_1hz.csv` | Harespod processed for the model: deltas from each subject's baseline, 30-second slopes, an altitude stage (0–6) and a `hypoxia_label` (0 none / 1 mild / 2 significant). Ready to train the hypoxia detector. |
| `demo_replay_hypoxia.csv` | One subject's (318c) 51-minute climb: SpO₂ falls from 0.95 to 0.25 of their personal range. This stream drives the HUD demo. |
| `demo_replay_startle.csv` | One NASA subject's (14) 6-minute startle session, per second, with the startle windows marked. This stream drives the "not hypoxia" beat in the demo. |

`sources/` holds the original NASA documents (evidence report, risk graph narrative and code, crew-state description). `scripts/build_hypoxia_dataset.py` rebuilds every derived file from the raw data.

## How the vision maps to the data

| Part of the product | Data |
|---|---|
| Hypoxia detector (SpO₂ + HR trend vs personal baseline) | `analog_harespod_features_1hz.csv` |
| Startle filter, so a startle doesn't trigger a hypoxia alarm | `nasa_crew_state_features_1hz.csv` |
| Triage rules and countermeasures in the C core | `nasa_hypoxia_risk_dag_*.csv`, `nasa_hypoxia_evidence_facts.csv` |
| Lunar setting and suit pressures | `nasa_exploration_atmospheres.csv` |
| Realistic fault scenarios | `nasa_eva_suit_incidents.csv` (e.g. Orlan O₂ injector, ISS Incr-9 2004; water in helmet, ISS Incr-36 2013) |
| Live demo streams | `demo_replay_hypoxia.csv`, `demo_replay_startle.csv` |

Validate both models with leave-one-subject-out splits (15 Harespod subjects, 18 NASA subjects) and put the results on the Validity slide.

## Know before you build

- **SpO₂ is not NASA data.** NASA publishes no open SpO₂ dataset; astronaut physiology sits in the Life Sciences Data Archive and needs a formal request. NASA supplies heart rate, HRV, breathing rate and skin response. SpO₂ comes from Harespod.
- **Harespod values are scaled 0–1 per person**, not real SpO₂ %. Use changes from baseline, not absolute thresholds. The NASA report gives no SpO₂ alarm thresholds.
- **Skin response is not used.** It can't be measured reliably in a suit: gloves cover the best sensor sites, and sweat from hard work swamps the signal. SpO₂ is the main way to tell the two apart (it falls in hypoxia and holds steady in startle). Heart rate, HRV and breathing rate add the startle pattern. In the labelled startle windows heart rate does not rise on average, so test a short lag before relying on it.
- **The incident list is keyword-filtered.** Read an entry's `Purpose` text before quoting it.
- Heart rate is detected from ECG; `ecg_quality_ok = 0` marks seconds where beat detection looked unreliable (about 3%).

## Sources (cite these in the submission)

**NASA**
- Flight Crew Physiological Data for Crew State Monitoring (data.nasa.gov): https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring
- Extra-vehicular Activity (EVA) – US and Russia (data.nasa.gov): https://data.nasa.gov/dataset/extra-vehicular-activity-eva-us-and-russia
- Risk of Hypobaric Hypoxia from the Exploration Atmosphere, evidence report 2015 (NASA NTRS): https://ntrs.nasa.gov/citations/20150021491
- Hypoxia Risk DAG narrative and code (NASA Human Research Program): https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/

**Analog**
- Harespod: Yang et al., "A high altitude respiration and SpO2 dataset for assessing the human response to hypoxia", *Scientific Data* 2024: https://www.nature.com/articles/s41597-024-03065-x · data: https://springernature.figshare.com/collections/Respiration_and_SPO2_dataset_for_assessing_the_human_response_to_hypoxia_at_high_altitude/6623344
