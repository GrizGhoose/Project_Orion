"""Build the HYPOXIA data pack from the raw files in the project.

Run from the project root:  python HYPOXIA/scripts/build_hypoxia_dataset.py
Needs: pandas, numpy, scipy, pypdf
"""
import json
import re
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
from pypdf import PdfReader
from scipy.signal import butter, filtfilt, find_peaks

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "HYPOXIA"
SRC_CSV = ROOT / "all_csvs"
SRC_HYP = ROOT / "Acute_WI" / "1_hypoxia"

RAW_FS = 256  # NASA crew-state sample rate (Hz)


# ---------------------------------------------------------------- raw copies
def copy_raw():
    pairs = {
        "nasa_eva_log_us_russia.csv": SRC_CSV / "nasa_eva_log_us_russia.csv",
        "nasa_crew_state_ecg_resp_256hz.csv": SRC_CSV / "nasa_crew_state_ecg_resp_gsr_256hz.csv",
        "analog_harespod_vitals_1hz.csv": SRC_CSV / "analog_harespod_hypoxia_vitals_1hz.csv",
        "analog_harespod_waveforms_100hz.csv": SRC_CSV / "analog_harespod_hypoxia_waveforms_100hz.csv",
    }
    for name, src in pairs.items():
        dst = OUT / name
        if dst.exists():
            pass
        elif name.startswith("nasa_crew_state"):
            pd.read_csv(src).drop(columns="GSR_EDA").to_csv(dst, index=False)
        else:
            shutil.copy2(src, dst)
        print("copied", name)


# ---------------------------------------------------- NASA crew-state features
def _bandpass(x, lo, hi, fs, order=3):
    b, a = butter(order, [lo / (fs / 2), hi / (fs / 2)], btype="band")
    return filtfilt(b, a, x)


def _lowpass(x, hi, fs, order=3):
    b, a = butter(order, hi / (fs / 2), btype="low")
    return filtfilt(b, a, x)


def _rpeaks(ecg, fs):
    """R-peak indices: band-pass, then peaks of the squared derivative (polarity-safe)."""
    f = _bandpass(ecg, 5, 20, fs)
    energy = np.gradient(f) ** 2
    energy = np.convolve(energy, np.ones(int(0.08 * fs)) / int(0.08 * fs), mode="same")
    thr = np.percentile(energy, 90) * 0.35
    peaks, _ = find_peaks(energy, height=thr, distance=int(0.33 * fs))
    return peaks


def _session_features(g):
    g = g.sort_values("TimeSecs")
    t = g["TimeSecs"].to_numpy()
    secs = np.arange(int(np.ceil(t.min())), int(np.floor(t.max())) + 1)
    out = pd.DataFrame({"t_s": secs})

    # heart rate + HRV from ECG
    pk = _rpeaks(g["ECG"].to_numpy(), RAW_FS)
    pt = t[pk]
    rr = np.diff(pt)
    ok = (rr > 0.33) & (rr < 1.5)  # 40-180 bpm
    rr_t, rr = pt[1:][ok], rr[ok]
    hr_inst = 60.0 / rr
    if len(rr) > 10:
        hr = pd.Series(hr_inst, index=rr_t)
        out["hr_bpm"] = np.interp(secs, rr_t, hr.rolling(5, center=True, min_periods=1).median().to_numpy())
        drr = np.abs(np.diff(rr)) * 1000
        drr = np.where(drr < 200, drr, np.nan)  # reject successive-beat jumps >200 ms as detection artefacts
        rm = pd.Series(drr ** 2, index=rr_t[1:]).rolling(30, min_periods=10).mean() ** 0.5
        out["hrv_rmssd_ms"] = np.interp(secs, rr_t[1:], rm.bfill().to_numpy())
        # beats seen per second-bin vs expected: quality flag
        counts = np.histogram(pt, bins=np.append(secs, secs[-1] + 1))[0]
        exp = out["hr_bpm"] / 60
        out["ecg_quality_ok"] = (pd.Series(counts).rolling(10, center=True, min_periods=1).mean()
                                 .sub(exp).abs().lt(0.5 * exp)).astype(int)
    else:
        out["hr_bpm"] = np.nan
        out["hrv_rmssd_ms"] = np.nan
        out["ecg_quality_ok"] = 0

    # breathing rate from the respiration belt
    resp = _lowpass(g["Respiration"].to_numpy() - g["Respiration"].mean(), 0.7, RAW_FS)
    bp, _ = find_peaks(resp, distance=int(1.5 * RAW_FS), prominence=np.std(resp) * 0.3)
    bt = t[bp]
    if len(bt) > 3:
        br = 60.0 / np.diff(bt)
        out["resp_rate_bpm"] = np.interp(secs, bt[1:], pd.Series(br).rolling(3, center=True, min_periods=1)
                                         .median().to_numpy())
    else:
        out["resp_rate_bpm"] = np.nan

    # labels, per second (skin response is dropped: not measurable in a suit)
    sec_idx = np.floor(t).astype(int)
    per_s = g.assign(_s=sec_idx).groupby("_s")
    out["state"] = out["t_s"].map(per_s["state"].agg(lambda s: s.mode().iat[0]))
    out["event"] = out["t_s"].map(per_s["Event"].max())
    return out


def build_crew_state_features():
    d = pd.read_csv(SRC_CSV / "nasa_crew_state_ecg_resp_gsr_256hz.csv")
    parts = []
    for (subj, exp), g in d.groupby(["subject", "experiment"]):
        f = _session_features(g)
        f.insert(0, "experiment", exp)
        f.insert(0, "crew", g["crew"].iat[0])
        f.insert(0, "subject", subj)
        parts.append(f)
    f = pd.concat(parts, ignore_index=True)

    # deltas vs each subject's own baseline (median over all their baseline-labelled seconds)
    base = f[f["state"] == "baseline"].groupby("subject")[["hr_bpm", "hrv_rmssd_ms", "resp_rate_bpm"]].median()
    for col in base.columns:
        f[f"{col}_delta"] = f[col] - f["subject"].map(base[col])
    f["is_startle"] = (f["state"] == "startle_surprise").astype(int)
    f = f.round(3)
    f.to_csv(OUT / "nasa_crew_state_features_1hz.csv", index=False)
    print("crew-state features", f.shape, "ECG quality ok:", f["ecg_quality_ok"].mean().round(3))
    return f


# --------------------------------------------------------- Harespod features
ALT_ORDER = {"pre": 0, "1500-2000": 1, "2000-2500": 2, "2500-3000": 3,
             "3000-3500": 4, "3500-4000": 5, "3500+": 5, "4000+": 6}


def build_harespod_features():
    d = pd.read_csv(SRC_CSV / "analog_harespod_hypoxia_vitals_1hz.csv", parse_dates=["timestamp"])
    d = d.sort_values(["subject", "timestamp"])
    d["altitude_stage"] = d["altitude_segment_m"].map(ALT_ORDER)
    d["t_s"] = d.groupby("subject")["timestamp"].transform(lambda s: (s - s.iloc[0]).dt.total_seconds()).astype(int)
    cols = ["spo2_norm", "heart_rate_norm", "pulse_rate_norm"]
    # personal baseline = the subject's lowest-altitude stages (pre + 1500-2000 m)
    base = d[d["altitude_stage"] <= 1].groupby("subject")[cols].median()
    for c in cols:
        d[f"{c}_delta"] = d[c] - d["subject"].map(base[c])
        d[f"{c}_slope30"] = d.groupby("subject")[c].transform(
            lambda s: s.rolling(30, min_periods=10).apply(lambda w: np.polyfit(np.arange(len(w)), w, 1)[0], raw=True))
    d["hypoxia_label"] = np.select([d["altitude_stage"] >= 5, d["altitude_stage"] >= 3], [2, 1], 0)
    d = d.drop(columns="timestamp").round(4)
    lead = ["subject", "t_s", "altitude_segment_m", "altitude_stage", "hypoxia_label"]
    d = d[lead + [c for c in d.columns if c not in lead]]
    d.to_csv(OUT / "analog_harespod_features_1hz.csv", index=False)
    print("harespod features", d.shape)
    return d


# -------------------------------------------------------------- demo replays
def build_demo_replays(hf, cf):
    # hypoxia: subject with the largest SpO2 drop at the top altitude stage
    top = hf[hf["altitude_stage"] >= 5].groupby("subject")["spo2_norm_delta"].median()
    subj = top.idxmin()
    r = hf[hf["subject"] == subj][["t_s", "altitude_segment_m", "hypoxia_label", "spo2_norm", "heart_rate_norm",
                                   "pulse_rate_norm", "spo2_norm_delta", "heart_rate_norm_delta"]]
    r.insert(0, "source_subject", subj)
    r.to_csv(OUT / "demo_replay_hypoxia.csv", index=False)

    # startle: SS session with the cleanest ECG and a clear startle window
    ss = cf[cf["experiment"] == "SS"]
    q = ss.groupby("subject").agg(q=("ecg_quality_ok", "mean"), n=("is_startle", "sum"))
    subj2 = q[q["n"] > 20].sort_values("q", ascending=False).index[0]
    r2 = ss[ss["subject"] == subj2][["subject", "t_s", "state", "is_startle", "hr_bpm", "hr_bpm_delta",
                                     "hrv_rmssd_ms", "hrv_rmssd_ms_delta", "resp_rate_bpm", "resp_rate_bpm_delta", "ecg_quality_ok"]]
    r2.to_csv(OUT / "demo_replay_startle.csv", index=False)
    print("demo replays: hypoxia subject", subj, "| startle subject", subj2)


# ------------------------------------------------------------- NASA DAG CSVs
def build_dag():
    raw = (SRC_HYP / "hypoxia_risk_dag_code.txt").read_text()
    clean = raw.replace("\\{", "{").replace("\\}", "}").replace("{[}", "[").replace("{]}", "]").replace("\\&", "&")
    clean = re.sub(r"\s*\n\s*", " ", clean)  # the export hard-wraps lines, even inside node names
    dag = json.loads(clean)
    nodes = pd.DataFrame([{"node": k, "category": v.get("category"),
                           "x": round(v["position"][0], 1), "y": round(v["position"][1], 1)}
                          for k, v in dag["nodes"].items()])
    edges = pd.DataFrame([{"edge_id": int(k), "source": v["source"], "dest": v["dest"],
                           "level_of_evidence": v.get("loe")} for k, v in dag["edges"].items()])
    nodes.to_csv(OUT / "nasa_hypoxia_risk_dag_nodes.csv", index=False)
    edges.sort_values("edge_id").to_csv(OUT / "nasa_hypoxia_risk_dag_edges.csv", index=False)
    print("DAG", len(nodes), "nodes,", len(edges), "edges")


# ------------------------------------------------------- EVA incident subset
# an EVA counts as an incident only if its notes describe something going wrong
PROBLEM = (r"\b(?:fail\w*|leak\w*|fog\w*|lost|damage\w*|problem\w*|malfunction\w*|terminat\w*|abort\w*|"
           r"curtail\w*|cut short|ended early|contaminat\w*|overheat\w*|exhaust\w*|injur\w*|unable|"
           r"water in|sick\w*|difficult\w*)\b")
INCIDENT_TAGS = {
    "helmet_or_visor": r"\b(?:helmet|visor|fog\w*)\b",
    "suit_or_glove": r"\b(?:suit|glove\w*|EMU|Orlan|PLSS|backpack|regulator)\b",
    "leak_or_contamination": r"\b(?:leak\w*|ammonia|NH3|contaminat\w*|bakeout|decontamination)\b",
    "thermal_or_cooling": r"\b(?:overheat\w*|coolant|cooling)\b",
    "oxygen_or_co2": r"\b(?:O2 regulator|oxygen|CO2|carbon dioxide)\b",
    "ended_early_or_aborted": r"\b(?:terminat\w*|abort\w*|curtail\w*|cut short|ended early|ended work)\b",
    "fatigue_or_injury": r"\b(?:fatigue\w*|exhaust\w*|tired|injur\w*|pain|sick\w*)\b",
}


def build_eva_incidents():
    d = pd.read_csv(SRC_CSV / "nasa_eva_log_us_russia.csv").drop_duplicates()
    for tag, pat in INCIDENT_TAGS.items():
        d[tag] = d["Purpose"].fillna("").str.contains(pat, case=False, regex=True).astype(int)
    tags = list(INCIDENT_TAGS)
    d["incident_tag_count"] = d[tags].sum(axis=1)
    d["describes_problem"] = d["Purpose"].fillna("").str.contains(PROBLEM, case=False, regex=True).astype(int)
    # station-hardware leaks alone don't count: keep problems touching the crew or their suit
    crew_facing = d[[t for t in tags if t != "leak_or_contamination"]].sum(axis=1) > 0
    inc = d[crew_facing & (d["describes_problem"] == 1)]
    inc.to_csv(OUT / "nasa_eva_suit_incidents.csv", index=False)
    print("EVA incidents", len(inc), "of", len(d))


# --------------------------------------- NASA evidence report → reference CSVs
def _page_of(pages, snippet):
    s = re.sub(r"\s+", " ", snippet)
    for i, p in enumerate(pages, 1):
        if s in re.sub(r"\s+", " ", p):
            return i
    return None


def build_evidence_tables():
    pages = [p.extract_text() for p in PdfReader(SRC_HYP / "hypobaric_hypoxia_evidence_report_2015.pdf").pages]

    atm = pd.DataFrame([
        ("ISS / sea-level cabin", 14.7, 21, None, None, None, "Earth-equivalent sea level atmosphere of 14.7 psia and 21%"),
        ("Shuttle staged decompression (pre-EVA)", 10.2, 26.5, 140, 87, 1265, "10.2 26.5 140 87 1265"),
        ("Exploration atmosphere (lunar/Mars habitats, current)", 8.2, 34, 144, 88, 1213, "8.2 34 144 88 1213"),
        ("EAWG 2006 recommendation (superseded)", 8.0, 32, None, None, None, "psia and 32% oxygen (O2) environment were recommended"),
        ("Lowest anticipated EVA suit pressure (100% O2)", 4.3, 100, None, None, None, "lowest anticipated suit pressure of 4.3 psia"),
    ], columns=["atmosphere", "pressure_psia", "o2_percent", "ppo2_mmhg", "alveolar_po2_mmhg",
                "equivalent_air_altitude_m", "_snippet"])
    atm["source_page"] = atm["_snippet"].map(lambda s: _page_of(pages, s))
    atm.drop(columns="_snippet").to_csv(OUT / "nasa_exploration_atmospheres.csv", index=False)

    facts = [
        ("atmosphere", "8.2 psia / 34% O2 chosen in 2012 to reduce hypoxic stress; inspired O2 pressure 128 mmHg", "altered to 8.2 psia and 34% O2 to reduce"),
        ("symptoms", "Most common symptoms after rapid ascent to 2,835 m: shortness of breath with activity 87%", "shortness of breath with activity (87%)"),
        ("symptoms", "Sleeping difficulty 74%, headache 66%, fatigue 65%, dizziness/lightheadedness 46% (South Pole, n=246)", "sleeping difficulty (74%)"),
        ("symptoms", "52% of 246 people rapidly taken to 2,835 m developed acute mountain sickness", "52% developed LLSQ-defined AMS"),
        ("symptoms", "7-25% of adults may get mild acute mountain sickness near 2,000 m", "Between 7% and 25% of adults may experience mild AMS"),
        ("symptoms", "AMS onset over 6 to 24 hours: headache plus nausea, dizziness, fatigue or sleeplessness", "6 to 24 hours"),
        ("performance", "Procedural errors appear to increase at 3,048 m (10,000 ft) though manual control holds", "procedural errors appear to increase"),
        ("performance", "Aircrew reported operationally significant hypoxia symptoms at a mean 2,590 m", "mean altitude of 2,590 m"),
        ("vision", "The retina is extremely sensitive to O2; low-light (mesopic) vision impaired at 1,830-2,438 m", "Mesopic vision refers to visual performance"),
        ("balance", "Postural sway increases at simulated 1,524-3,048 m: a sensitive indicator of mild hypoxia", "Postural sway measured in subjects"),
        ("monitoring", "At simulated 2,438 m SaO2 was below 90% for 44.4% of sleep time vs 0.1% at sea level", "44.4% of the time at altitude"),
        ("countermeasure", "Crew must be trained to recognise their symptoms; avoid critical tasks and keep workload low during atmosphere transitions", "Critical tasks should be avoided"),
        ("countermeasure", "Supplemental O2 should be available during decompressions and throughout the mission", "Supplemental O2 should be available"),
        ("countermeasure", "Gradual decompression from 14.7 to 8.2 psia diminishes acute symptoms such as AMS", "Gradual decompression"),
    ]
    f = pd.DataFrame(facts, columns=["topic", "finding", "_snippet"])
    f["source_page"] = f["_snippet"].map(lambda s: _page_of(pages, s))
    f.drop(columns="_snippet").to_csv(OUT / "nasa_hypoxia_evidence_facts.csv", index=False)
    print("evidence tables written; missing pages:",
          int(atm["source_page"].isna().sum() + f["source_page"].isna().sum()))


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    copy_raw()
    build_dag()
    build_eva_incidents()
    build_evidence_tables()
    hf = build_harespod_features()
    cf = build_crew_state_features()
    build_demo_replays(hf, cf)
