# NASA dataset audit — Phase 2

Audit date: 14 November 2026. Scope: the existing application and `../Datasets/` relative to the repository. This resolves to `NASA Hackathon/Datasets/`, alongside the application. The parent of the initial shell working directory does not contain a second `Datasets/` folder.

## Finding: the CSV payloads are missing

All 13 CSV-named entries are **macOS AppleDouble metadata sidecars** prefixed `._`. None has its unprefixed data file beside it. Their common big-endian magic is `0x00051607`, version `0x00020000`. Each contains entry 9 (Finder metadata/attributes, including `com.apple.provenance`) and entry 2 (an empty resource fork). There is no entry 1 data fork, CSV header, observation, column definition or unit declaration. Renaming these sidecars does not recover the data. No attempt was made to treat their binary contents as observations or execute the metadata-named script.

The eight `nasa_` datasets have **no inspectable data content**. A NASA-looking filename does not establish NASA provenance or validity. Consequently, columns, units, coverage, missingness, sampling rates, licences, transformation methods and scientific relationships are **unverifiable** for every row below. Rates in filenames are only hints, not confirmed sampling metadata.

## Per-dataset audit table

Locations below link to the sidecars actually present. The requested data file is the same basename with the initial `._` removed. **For every row: frontend use = none; columns/units = unavailable; real-time hypoxia-rule support = not demonstrated.** The final column is a potential role inferred only from the name, to be reassessed after the original files and provenance are supplied.

| Existing location                                                                             | Bytes | Columns and units                               | Current use / CSV-to-UI flow | Possible purpose and hypoxia limitations, inferred from name only                                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ----: | ----------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [._nasa_crew_state_ecg_resp_256hz.csv](../../Datasets/._nasa_crew_state_ecg_resp_256hz.csv)   |   163 | Unknown; “256 Hz” unverified                    | Unused; no ingestion path    | Possibly ECG/respiration waveforms. Cannot assume paired SpO₂, hypoxia exposure labels, physiological units or validated ECG-to-HR processing. Alone cannot validate SpO₂/HR hypoxia rules.                            |
| [._nasa_crew_state_features_1hz.csv](../../Datasets/._nasa_crew_state_features_1hz.csv)       |   163 | Unknown; “1 Hz” unverified                      | Unused; no ingestion path    | Possibly derived crew-state features. Require feature definitions, extraction code, cohort and ground truth. Derived features cannot be treated as sensor measurements.                                                |
| [._nasa_eva_log_us_russia.csv](../../Datasets/._nasa_eva_log_us_russia.csv)                   |   249 | Unknown                                         | Unused; no ingestion path    | Possibly EVA historical logs. A mission/context reference, unless subject-linked physiological observations are documented. Event counts/durations do not calibrate individual physiological limits.                   |
| [._nasa_eva_suit_incidents.csv](../../Datasets/._nasa_eva_suit_incidents.csv)                 |   163 | Unknown                                         | Unused; no ingestion path    | Possibly incident descriptions. Could inform scenario narratives and hazard review; anecdotal incidents cannot establish diagnostic sensitivity or specific SpO₂/HR thresholds.                                        |
| [._nasa_exploration_atmospheres.csv](../../Datasets/._nasa_exploration_atmospheres.csv)       |   163 | Unknown; pressure and O₂ conventions unverified | Unused; no ingestion path    | Possibly atmosphere conditions. Reference context only until original pressure units, oxygen fraction/partial pressure and exposure duration are known. Cannot directly map atmosphere composition to individual SpO₂. |
| [._nasa_hypoxia_evidence_facts.csv](../../Datasets/._nasa_hypoxia_evidence_facts.csv)         |   163 | Unknown                                         | Unused; no ingestion path    | Possibly extracted evidence statements. Require source page, quotation context, population and extraction method for every fact. Suitable as reviewed reference material, not automatic rule authority.                |
| [._nasa_hypoxia_risk_dag_nodes.csv](../../Datasets/._nasa_hypoxia_risk_dag_nodes.csv)         |   163 | Unknown                                         | Unused; no ingestion path    | Possibly conceptual risk graph nodes. Not measured physiology or a calibrated probability model. Reference/traceability role if provenance is recovered.                                                               |
| [._nasa_hypoxia_risk_dag_edges.csv](../../Datasets/._nasa_hypoxia_risk_dag_edges.csv)         |   163 | Unknown                                         | Unused; no ingestion path    | Possibly graph relationships. An edge does not establish effect size, causality, direction certainty or a numeric alert cutoff. No inference engine is justified.                                                      |
| [._analog_harespod_vitals_1hz.csv](../../Datasets/._analog_harespod_vitals_1hz.csv)           |   249 | Unknown; “1 Hz” unverified                      | Unused; no ingestion path    | Possibly analog-study vitals; “analog” does not mean NASA/flight data. Need protocol, device/site, cohort, exposure and labels before assessing relevance to SpO₂/HR.                                                  |
| [._analog_harespod_features_1hz.csv](../../Datasets/._analog_harespod_features_1hz.csv)       |   163 | Unknown; “1 Hz” unverified                      | Unused; no ingestion path    | Possibly analog-derived features. Need formulas, missing-data handling and source alignment. Cannot validate hypoxia discrimination without independently established exposure/outcome labels.                         |
| [._analog_harespod_waveforms_100hz.csv](../../Datasets/._analog_harespod_waveforms_100hz.csv) |   249 | Unknown; “100 Hz” unverified                    | Unused; no ingestion path    | Possibly analog waveforms. Signal type, calibration and ground truth unknown; cannot assume ECG, PPG or SpO₂ derivability.                                                                                             |
| [._demo_replay_hypoxia.csv](../../Datasets/._demo_replay_hypoxia.csv)                         |   163 | Unknown                                         | Unused; no ingestion path    | Possibly demonstration replay. Even if restored, synthetic scenario labels would not validate the rules that generated them. Could support deterministic UI regression fixtures if labelled simulated.                 |
| [._demo_replay_startle.csv](../../Datasets/._demo_replay_startle.csv)                         |   163 | Unknown                                         | Unused; no ingestion path    | Possibly demonstration replay for a contrasting workload/startle event. Not evidence for distinguishing startle from hypoxia without independent measurements and validated labels.                                    |

## Missing documentation and “Explain hypoxia data”

No accessible file or folder named **Explain hypoxia data** was found in the workspace. If this refers to an external document or attachment, its contents were not available for inspection. Specifically missing ordinary files, represented only by metadata sidecars:

- `../Datasets/README.md`
- `../Datasets/scripts/build_hypoxia_dataset.py`
- `../Datasets/sources/crew_state_description.txt`
- `../Datasets/sources/hypobaric_hypoxia_evidence_report_2015.pdf`
- `../Datasets/sources/hypoxia_risk_dag_code.txt`
- `../Datasets/sources/hypoxia_risk_dag_narrative.pdf`
- All 13 ordinary CSV files listed in the table, with the `._` prefixes removed.

The PDF-named sidecars are not PDF documents and were not reported as read. Recover the ordinary files from the original dataset package/export, not just a `__MACOSX` metadata directory. Preserve accompanying README, data dictionary, source URLs/IDs, licence, subject/exposure protocol and transformation script. Do not run any supplied script until its actual code has been inspected.

## Actual current data flow

Source inspection of `src/` found no CSV loader, `nasa_` reference, dataset import, fetch call or hardware WebSocket path. Neither route reads this external dataset folder; Vite does not automatically bundle sibling folders.

1. [scenarios.js](../src/simulation/scenarios.js) defines six demonstration IDs/descriptions.
2. [generateFrame](../src/simulation/telemetrySimulator.js) creates sinusoidal seeded values and scenario-specific changes in JavaScript. It does **not** replay any CSV. SpO₂ is a simulated measurement; it is not calculated from ECG, atmospheric pressure or oxygen reserve. Heart rate is independently simulated.
3. [evaluateAlerts](../src/features/alerts/alertLogic.js) compares those numbers to illustrative limits in [config.js](../src/constants/config.js). Those limits have no linkage to a NASA CSV, cited validation study or reviewed flight procedure.
4. [simulationProvider.js](../src/services/telemetry/simulationProvider.js) publishes authoritative demonstration snapshots; [telemetryStore.js](../src/store/telemetryStore.js) retains 120 history samples and 40 events. BroadcastChannel copies snapshots between same-origin tabs.
5. [HelmetPage.jsx](../src/features/helmet/pages/HelmetPage.jsx) renders supported demonstration signals and alerts. Phase 3 removes the local companion UI while preserving shared history/events and the provider contract for an independently developed consumer. No displayed value, limit or alert is NASA-data-derived.

Thus **all 13 datasets are unused**, not partially integrated. Dataset retrieval would not automatically make any current alert rule scientifically supported.

## What could legitimately support interpretation?

No local file currently supports a new hypoxia rule. Keep current alerts explicitly labelled demonstration limit checks. Do not describe “normal” demo limits as proof of normal tissue oxygenation, or high heart rate alone as a hypoxia diagnosis. Future reviewed rules need measurement quality, device/site validation, appropriate baseline/workload context, persistence, hysteresis, missing/stale-data behaviour, and evidence tied to the intended use.

NASA's [2015 hypobaric hypoxia evidence report landing page](https://ntrs.nasa.gov/citations/20150021491) provides exploration-atmosphere risk context. This external reference is **not evidence that the unavailable local CSV correctly transcribes it**, and it does not by itself validate this application's numerical cutoffs. The [FDA pulse-oximetry overview](https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters) describes reading limitations including circulation and pigmentation. These limitations argue for quality/status handling and reviewed rules, not a new automatic diagnosis.

ECG-derived HR and oximeter pulse rate must also remain distinguishable in provenance. No machine learning, gene-expression inference, DAG inference or medically validated classifier was added.

## Required next audit

After the ordinary files arrive: inspect header and sample rows; establish units, timestamps, cohort, device, protocol, licence and original source; quantify row counts, missing/invalid values and duplicates; inspect extraction methods and source-page citations; distinguish measured/derived/synthetic columns; then decide which files are reference-only and which can be explicit, labelled replay fixtures. Only domain-reviewed evidence should change rule configuration.
