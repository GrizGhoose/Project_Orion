# Acute_WI: acute work-incident datasets

Datasets for detecting **acute events during spacewalks (EVA) and other work accidents**, grouped by incident. Each item states whether it comes from NASA.

**Summary:** 3 CSV datasets are from NASA, 4 are non-NASA analogs (used where NASA has published no equivalent data), and all reference documents are from NASA.

| Folder | Incident | Main dataset | From NASA? |
|---|---|---|---|
| `1_hypoxia/` | Suit leak, life-support failure | Harespod hypobaric chamber | ❌ No (analog) |
| `2_decompression_sickness/` | Bubbles after EVA depressurization | Doppler VGE repository (divers) | ❌ No (analog); NASA models included |
| `3_stress_startle/` | Panic / startle after an accident | Flight Crew Physiological Data | ✅ Yes |
| `4_chest_trauma/` | Pneumothorax, blunt chest injury | Lung-ultrasound labels | ❌ No (analog) |
| `5_radiation_spike/` | Solar event or radiation belt during EVA | ISS TEPC dose rate | ✅ Yes |
| `6_eva_suit_injury/` | Suit-induced injury, EVA mishaps | EVA log US & Russia | ✅ Yes |

---

## 1_hypoxia
| File | What it is | NASA? |
|---|---|---|
| `analog_harespod_hypoxia_vitals_1hz.csv` | 15 adults in a hypobaric chamber, 1,500 → 4,000 m. Heart rate, pulse rate and SpO₂ each second, labelled by altitude segment. | ❌ Harespod (Scientific Data 2024, figshare) |
| `analog_harespod_hypoxia_waveforms_100hz.csv` | Same subjects: respiration and PPG (pulse oximeter) waveforms at 100 Hz. | ❌ Harespod |
| `hypobaric_hypoxia_evidence_report_2015.pdf` | NASA evidence on hypoxia risk in exploration cabin atmospheres. | ✅ NASA HRP |
| `hypoxia_risk_dag_narrative.pdf`, `hypoxia_risk_dag_code.txt` | NASA cause-and-effect graph of hypoxia risk, usable as model structure. | ✅ NASA HRP |

⚠️ Harespod values are normalized 0–1 per subject: use them for trends, and take clinical SpO₂ thresholds from the NASA report. No public NASA hypoxia physiology dataset exists (NASA LSDA data needs a formal request).

## 2_decompression_sickness
| File | What it is | NASA? |
|---|---|---|
| `analog_doppler_vge_grades_metadata.csv` | 10,099 Doppler recordings of venous gas bubbles in divers: Spencer/KM bubble grade, dive profile, age, sex and **whether DCS occurred**. Audio is in `02_dcs/` via the fetch script. | ❌ Zenodo (divers) |
| `nasa_hypobaric_dcs_database_1982-1998.pdf` | Description of NASA's altitude-chamber DCS database (548 exposures) and its variables. | ✅ NASA |
| `nasa_dcs_treatment_model_TP-2014-218561.pdf` | NASA model giving probability of DCS and of symptom resolution. | ✅ NASA |
| `nasa_dcs_loglogistic_survival_TP-2001-210775.pdf` | NASA time-to-DCS model (prebreathe, pressure, exercise). | ✅ NASA |
| `dcs_risk_dag_narrative.pdf`, `dcs_risk_dag_code.txt` | NASA cause-and-effect graph of DCS risk. | ✅ NASA HRP |

## 3_stress_startle
| File | What it is | NASA? |
|---|---|---|
| `nasa_crew_state_ecg_resp_gsr_256hz.csv` | 17 pilots, 256 Hz ECG, respiration and skin response (EDA), labelled `baseline`, `startle_surprise`, `channelized_attention`, `diverted_attention`. | ✅ data.nasa.gov |
| `crew_state_description.txt` | NASA's original description of the dataset and its fields. | ✅ |

## 4_chest_trauma
| File | What it is | NASA? |
|---|---|---|
| `analog_openpocus_lung_us_labels.csv` | 250 patients' lung-ultrasound labels: device, normal/abnormal, 12 lung-zone scores. Images are on Stanford Box (see `06_ultrasound/`). | ❌ OpenPOCUS (Stanford) |
| `analog_lung_us_pneumothorax_benchmark_manifest.csv` | 280 lung-ultrasound clips labelled for pneumothorax / lung sliding, with time window and region of interest. | ❌ Zenodo (arXiv 2603.26832) |

## 5_radiation_spike
| File | What it is | NASA? |
|---|---|---|
| `nasa_iss_tepc_dose_rate_2010-2017.csv` | ISS dose rate every minute (µGy/min, µSv/min), ISS position, and dominant source: `GCR`, `Trapped` (South Atlantic Anomaly) or `Solar` (solar particle event). | ✅ NASA SPDF / data.nasa.gov |

## 6_eva_suit_injury
| File | What it is | NASA? |
|---|---|---|
| `nasa_eva_log_us_russia.csv` | All 375 US and Russian EVAs since 1965: crew, date, duration and purpose, with incident notes (helmet fogging, overheating, glove problems). | ✅ data.nasa.gov |
| `eva_injury_evidence_report_2022.pdf` | NASA evidence on EVA injuries (shoulder, hand, wrist) and their causes. | ✅ NASA HRP |

No open dataset of suit-injury physiology exists; the log and report are the best available sources.
