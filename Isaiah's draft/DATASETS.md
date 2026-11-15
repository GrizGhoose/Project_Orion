# Collected datasets: astronaut acute-event monitor (NASA Space Apps)

Collected 2026-11-13. Each item is labeled **[NASA]** or **[analog]** (non-NASA terrestrial analog data from the project README).

**Start with `README.md` and the `all_csvs/` folder**, where every tabular dataset has been cleaned and collated into one place. This file is the full source list.

To keep the zip small, raw files that are already converted into `all_csvs/` are not included: the TEPC `.cdf` files, RadLab per-instrument CSVs, Harespod `.7z` archives and crew-state `.zip` archives. Run `./fetch_large_files.sh` for the raw crew-state data (adds EEG and full-flight LOFT sessions) and the 9.4 GB Doppler audio.

---

## NASA data

### 07_nasa_open_data_portal: from data.nasa.gov
| Folder | What it is | Use in the monitor |
|---|---|---|
| `crew_state_physiology/` **[NASA]** | *Flight Crew Physiological Data for Crew State Monitoring*. 18 pilots, 256 Hz **ECG, respiration, GSR (EDA), 20-ch EEG**, labeled events: startle/surprise, channelized attention, diverted attention. Benchmark plus full-flight simulation (LOFT). See `description.txt`. 17 zips, ~2 GB. | Acute stress and startle detection, HR/HRV and respiration features, cognitive state. NASA-sourced replacement for WESAD. |
| `eva_log_us_russia/` **[NASA]** | *Extra-vehicular Activity (EVA): US and Russia*. Every EVA from 1965 onward, with crew, vehicle, date, duration, purpose and incident notes (CSV + JSON). | EVA duration and context priors, real incident examples (helmet fogging, overheating, etc.). |

### 05_other_hazards: radiation
| Folder | What it is |
|---|---|
| `iss_tepc_10s_spdf/` **[NASA]** | ISS Tissue Equivalent Proportional Counter (TEPC) dose analyzer, 10-second resolution, 2010–2017, CDF format (read with `cdflib` in Python). From NASA SPDF via data.nasa.gov. 340 MB. |
| `radlab_iss_dosimetry/` **[NASA]** | NASA OSDR RadLab exports: absorbed dose rate, dose equivalent rate, flux, ISS module, lat/lon/altitude. Instruments: ALTEA, ISS RAD, REM, TEPC/IV-TEPC, TriTel, CRaTER (lunar orbit), MSL-RAD (Mars surface). 105 MB CSV. |
| `hera_sirius_standard_measures_abstract.pdf` **[NASA]** | Isolation analog measures (abstract; the data needs an agreement). |

### 04_space_human: NASA OSDR, Inspiration4 crew
| Folder | What it is |
|---|---|
| `inspiration4_cbc_OSD-569/` **[NASA]** | Complete blood count, pre/in/post flight |
| `inspiration4_clinical_OSD-575/` **[NASA]** | Comprehensive metabolic panel, serum immune and cardiovascular cytokines |
| `inspiration4_plasma_omics_OSD-571/` **[NASA]** | Processed plasma proteomics and metabolomics |
| `inspiration4_soma_code/` | SOMA analysis code (Weill Cornell) |

### 01_nasa_hrp_evidence: choosing indicators [NASA]
EVA injury evidence report (2022), hypobaric hypoxia evidence report (2015), and the **DCS and hypoxia risk DAGs** (PDF narrative plus machine-readable `.txt` code, usable as model structure).

### 02_dcs: NASA DCS reports [NASA]
`nasa_hypobaric_dcs_database_1982-1998.pdf`, `nasa_dcs_treatment_model_TP-2014-218561.pdf`, `nasa_dcs_loglogistic_survival_TP-2001-210775.pdf`. These hold the model equations and coefficients for a parametric DCS risk score.

---

## Analog datasets (non-NASA, from the README)
| Folder | What it is |
|---|---|
| `02_dcs/doppler_vge_10k_zenodo/` **[analog]** | 10,099 graded Doppler bubble recordings from divers (9.4 GB; metadata xlsx included, audio via fetch script) |
| `02_dcs/doppler_synthetic_zenodo/` **[analog]** | Synthetic Doppler sample (full set 29 GB, optional) |
| `03_hypoxia/harespod_hypobaric_spo2/` **[analog]** | Harespod hypobaric chamber: SpO₂, respiration, HR at 100 Hz, 23 subjects |
| `06_ultrasound/` **[analog]** | OpenPOCUS metadata, BEDLUS code, pneumothorax benchmark manifest |

---

## Large files (`./fetch_large_files.sh`)
- `07_nasa_open_data_portal/crew_state_physiology/crew_*.zip`: ~2 GB, NASA
- `02_dcs/doppler_vge_10k_zenodo/doppler_audio_full.7z`: 9.4 GB, analog
- `--synthetic`: optional 29 GB synthetic Doppler set

## Not available / manual
| Item | Status |
|---|---|
| NASA LSDA/LSAH (real astronaut EVA physiology), NASA DCS DB raw records | By formal request via nlsp.nasa.gov |
| WESAD | The original download link is dead (404); replaced by the NASA crew-state dataset above |
| OpenPOCUS images, BEDLUS videos | Stanford Box / Harvard Dataverse (access request) |
| NASA DCS evidence report 2016 | humanresearchroadmap.nasa.gov/evidence/reports/DCS.pdf |
