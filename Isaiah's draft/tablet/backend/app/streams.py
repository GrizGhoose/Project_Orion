"""Builds per-second crew telemetry streams from the HYPOXIA data pack.

SpO2 and HR for the hypoxia stream come from Harespod (scaled 0-1 per person),
so they are mapped onto display units with fixed, documented ranges. HRV and
breathing rate come from the NASA crew-state dataset. Suit pressure is
simulated from physics so it matches the equivalent altitude of the replay.
"""
import csv
import math
import random
from dataclasses import dataclass

from .config import DATA_DIR, TH

# Display mapping for Harespod's per-person 0-1 scaling (assumption, see README).
SPO2_MIN, SPO2_SPAN = 75.0, 24.0
HR_MIN, HR_SPAN = 55.0, 70.0

SUIT_NOMINAL_PSIA = 4.3       # nasa_exploration_atmospheres.csv
MMHG_PER_PSI = 51.715
WATER_VAPOUR_MMHG = 47.0

SOURCES = {
    "spo2": "Analog: Harespod hypobaric chamber (Sci Data 2024), scaled per person, shown as 75-99 %",
    "hr": "EV1: Harespod. EV2: NASA Flight Crew Physiological Data (ECG-derived)",
    "hrv": "NASA Flight Crew Physiological Data for Crew State Monitoring (ECG-derived RMSSD)",
    "resp": "NASA Flight Crew Physiological Data for Crew State Monitoring (ECG-derived breathing)",
    "suit": "Simulated from NASA suit spec (4.3 psia, 100 % O2) and the replay's equivalent altitude",
    "reaction": "Simulated here; measured live by the helmet HUD reaction check",
    "dcs_model": "NASA TP-2014-218561 Hypobaric DCS Treatment Model (Conkin et al.)",
}


@dataclass
class Sample:
    spo2: float
    hr: float
    hrv: float
    resp: float
    suit_psia: float
    eq_alt_m: float
    truth: str  # what the data really is: nominal / hypoxia / startle


def _read(name):
    with open(DATA_DIR / name, newline="") as f:
        return list(csv.DictReader(f))


def _f(x, default=float("nan")):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def baro_mmhg(alt_m):
    return 760.0 * (1 - 2.25577e-5 * alt_m) ** 5.25588


def suit_psia_for_altitude(alt_m):
    """Suit pressure (100 % O2) giving the same inspired O2 as air at alt_m."""
    pio2 = 0.2095 * (baro_mmhg(alt_m) - WATER_VAPOUR_MMHG)
    return (pio2 + WATER_VAPOUR_MMHG) / MMHG_PER_PSI


def _segment_altitudes(rows):
    """Spread each altitude segment ("2000-2500", "4000+") linearly over its rows."""
    out, i = [], 0
    while i < len(rows):
        seg = rows[i]["altitude_segment_m"]
        j = i
        while j < len(rows) and rows[j]["altitude_segment_m"] == seg:
            j += 1
        if seg.endswith("+"):
            lo, hi = float(seg[:-1]), float(seg[:-1]) + 500
        elif "-" in seg:
            lo, hi = (float(v) for v in seg.split("-"))
        else:
            lo = hi = 0.0
        n = j - i
        out += [lo + (hi - lo) * k / max(n - 1, 1) for k in range(n)]
        i = j
    return out


def _nasa_background(subject, state="baseline"):
    """HRV and breathing rate from one NASA subject, quality-checked seconds only."""
    rows = [r for r in _read("nasa_crew_state_features_1hz.csv")
            if r["subject"] == subject and r["state"] == state and r["ecg_quality_ok"] == "1"]
    pairs = [(_f(r["hrv_rmssd_ms"]), _f(r["resp_rate_bpm"])) for r in rows]
    return [p for p in pairs if all(map(is_finite, p))]


def _harespod_calm(subject):
    rows = [r for r in _read("analog_harespod_features_1hz.csv")
            if r["subject"] == subject and r["altitude_stage"] in ("0", "1")]
    return [(SPO2_MIN + SPO2_SPAN * _f(r["spo2_norm"]), HR_MIN + HR_SPAN * _f(r["heart_rate_norm"]))
            for r in rows]


def _noise(rng, sd):
    return rng.gauss(0, sd)


def hypoxia_stream(seed=1):
    """EV1: subject 318c's 51-minute climb, framed as a suit O2 regulator fault."""
    rng = random.Random(seed)
    rows = _read("demo_replay_hypoxia.csv")
    alts = _segment_altitudes(rows)
    bg = _nasa_background("13")
    out = []
    for k, (r, alt) in enumerate(zip(rows, alts)):
        hrv, resp = bg[k % len(bg)]
        if k < TH.baseline_s:
            # Pre-EVA and early EVA: suit nominal; the regulator fault starts afterwards.
            suit, eq_alt = SUIT_NOMINAL_PSIA + _noise(rng, 0.01), 0.0
        else:
            suit, eq_alt = suit_psia_for_altitude(alt) + _noise(rng, 0.01), alt
        out.append(Sample(
            spo2=SPO2_MIN + SPO2_SPAN * _f(r["spo2_norm"]),
            hr=HR_MIN + HR_SPAN * _f(r["heart_rate_norm"]),
            hrv=hrv, resp=resp,
            suit_psia=suit, eq_alt_m=eq_alt,
            truth="hypoxia" if r["hypoxia_label"] != "0" else "nominal",
        ))
    return out


def startle_stream(length, seed=2):
    """EV2: NASA subject 14's startle session (looped), SpO2 steady from Harespod 223b."""
    rng = random.Random(seed)
    nasa = _read("demo_replay_startle.csv")
    calm = _harespod_calm("223b")
    out = []
    for k in range(length):
        r = nasa[k % len(nasa)]
        spo2, _ = calm[k % len(calm)]
        out.append(Sample(
            spo2=spo2, hr=_f(r["hr_bpm"]), hrv=_f(r["hrv_rmssd_ms"]), resp=_f(r["resp_rate_bpm"]),
            suit_psia=SUIT_NOMINAL_PSIA + _noise(rng, 0.01), eq_alt_m=0.0,
            truth="startle" if r["is_startle"] == "1" else "nominal",
        ))
    return out


def nominal_stream(length, harespod_subject="223b", nasa_subject="18", seed=3):
    rng = random.Random(seed)
    calm = _harespod_calm(harespod_subject)
    bg = _nasa_background(nasa_subject)
    out = []
    for k in range(length):
        spo2, hr = calm[k % len(calm)]
        hrv, resp = bg[k % len(bg)]
        out.append(Sample(spo2=spo2, hr=hr, hrv=hrv, resp=resp,
                          suit_psia=SUIT_NOMINAL_PSIA + _noise(rng, 0.01), eq_alt_m=0.0, truth="nominal"))
    return out


def build(kind, length):
    if kind == "hypoxia":
        return hypoxia_stream()
    if kind == "startle":
        return startle_stream(length)
    return nominal_stream(length)


def reaction_time_ms(rng, z, spo2):
    """Simulated HUD reaction check: slows as SpO2 falls, missed when severe."""
    if spo2 < 84:
        return None
    return round(330 + max(0.0, -z) * 45 + rng.gauss(0, 25))


def is_finite(x):
    return x is not None and not (isinstance(x, float) and math.isnan(x))
