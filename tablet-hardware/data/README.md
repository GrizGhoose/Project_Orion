# Data used by this app

These are copies of 5 files from the HYPOXIA data pack. Everything else in the pack is optional.

| File | Used for |
|---|---|
| `nasa_hypoxia_evidence_facts.csv` | "Why this step" notes in the response flows (NASA NTRS 20150021491, with page numbers) |
| `demo_replay_hypoxia.csv` | NASA tab, EV1: analog Harespod hypobaric SpO₂ climb |
| `demo_replay_startle.csv` | NASA tab, EV2: NASA crew-state startle session (heart rate, HRV, breathing) |
| `nasa_crew_state_features_1hz.csv` | HRV and breathing rate for the NASA tab, and the detector tests |
| `analog_harespod_features_1hz.csv` | Calm SpO₂ for the NASA tab's EV2, and the detector tests |

The live MAX tab uses none of these; it reads the ESP32 sensors. To use the full data pack instead, set `HYPOXIA_DIR=/path/to/HYPOXIA`.

Sources:
- NASA Flight Crew Physiological Data for Crew State Monitoring: https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring
- NASA Risk of Hypobaric Hypoxia evidence report: https://ntrs.nasa.gov/citations/20150021491
- Harespod, *Scientific Data* 2024 (analog): https://www.nature.com/articles/s41597-024-03065-x
