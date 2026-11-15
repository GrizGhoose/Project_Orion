"""Export everything the browser-only demo build needs into frontend/public/demo/data.json.

The hosted (Vercel) build has no Python server and no ESP32 boards, so:
- the MAX tab is fed a simulated board: MAX30102 SpO₂ and HR (whole numbers) from Harespod
  subjects not used on the NASA tab, plus the optional keys a board may send (app/sensors.py):
  HRV and breathing from NASA crew-state subjects not used elsewhere, and suit pressure / O₂-equivalent
  altitude simulated from the climb's altitude, as in app/streams.py;
- the NASA tab is left out of the hosted build, so its recordings are not exported;
- the demo is shortened: a 10 s pre-EVA baseline (DEMO_TH), and EV1's climb is cut so the
  hypoxia caution alarm fires at mission second 20 (checked here with app/detector.py);
- protocols and config are baked in, and the detector runs in the browser (frontend/src/demo/).
Re-run this after changing data, protocols or thresholds:

    cd tablet-hardware/backend && .venv/bin/python export_demo.py
"""
import csv
import json
import random
from dataclasses import replace
from pathlib import Path

from app import streams
from app.config import CREW, DATA_DIR, TH
from app.detector import HypoxiaDetector
from app.dcs_model import OPTIONS as DCS_OPTIONS
from app.server import SOURCES, load_protocol

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "demo" / "data.json"

# Simulated sensor feed. 314b climbs into hypoxia; 321a's calm stage (resting HR ~78) never reaches caution
# (checked against app/detector.py).
MAX_SIM = {"EV1": "314b", "EV2": "321a"}
MAX_SIM_NASA = {"EV1": "19", "EV2": "23"}  # HRV and breathing (baseline state); cleanest ECG-derived breathing (9-32 /min)

DEMO_TH = replace(TH, baseline_s=10)  # hosted demo: 10 s pre-EVA baseline instead of 4 min
EV1_ALARM_AT_S = 20                   # mission second at which EV1's hypoxia caution should fire


def harespod_climb(subject):
    rows = [r for r in csv.DictReader(open(DATA_DIR / "analog_harespod_features_1hz.csv", newline=""))
            if r["subject"] == subject]
    vitals = [(streams.SPO2_MIN + streams.SPO2_SPAN * float(r["spo2_norm"]),
               streams.HR_MIN + streams.HR_SPAN * float(r["heart_rate_norm"])) for r in rows]
    return vitals, streams._segment_altitudes(rows)


def first_alarm(pairs):
    """Mission second of the first caution/warning, as the detector sees the whole-number readings."""
    det = HypoxiaDetector(DEMO_TH)
    for t, (s, h) in enumerate(pairs):
        if det.update(round(s), round(h))["level"] in ("CAUTION", "WARNING"):
            return t
    return None


def splice_to_alarm(pairs, alts):
    """Keep the calm baseline seconds, then jump into the climb so the first alarm lands on EV1_ALARM_AT_S."""
    base = DEMO_TH.baseline_s
    for k in range(base, len(pairs)):
        cut = pairs[:base] + pairs[k:]
        if first_alarm(cut) == EV1_ALARM_AT_S:
            return cut, alts[:base] + alts[k:]
    raise SystemExit(f"No cut of the climb puts EV1's first alarm at {EV1_ALARM_AT_S} s")


def sensor(pairs, nasa_subject, alts=None, seed=0):
    """What a board reports: whole-number SpO₂ and HR (MAX30102), plus HRV, breathing and suit pressure.
    With alts, the suit O₂ regulator fault starts after the baseline, as in streams.hypoxia_stream()."""
    rng = random.Random(seed)
    bg = streams._nasa_background(nasa_subject)
    eq = [alt if alts and k >= DEMO_TH.baseline_s else 0.0 for k, alt in enumerate(alts or [0.0] * len(pairs))]
    return {
        "spo2": [round(s) for s, _ in pairs], "hr": [round(h) for _, h in pairs],
        "hrv": [round(bg[k % len(bg)][0]) for k in range(len(pairs))],
        "rr": [round(bg[k % len(bg)][1], 1) for k in range(len(pairs))],
        "suit": [round((streams.suit_psia_for_altitude(a) if a else streams.SUIT_NOMINAL_PSIA) + rng.gauss(0, 0.01), 3) for a in eq],
        "eq": [round(a) for a in eq],
    }


def main():
    climb, alts = splice_to_alarm(*harespod_climb(MAX_SIM["EV1"]))
    calm = [(s.spo2, s.hr) for s in streams.nominal_stream(len(climb), harespod_subject=MAX_SIM["EV2"])]
    assert first_alarm(calm) is None, "EV2 must stay alarm-free"
    data = {
        "config": {
            "crew": CREW,
            "thresholds": DEMO_TH.__dict__,
            "sources": {
                **{k: v for k, v in SOURCES.items() if k != "nasa tab"},
                "spo2": f"Simulated MAX30102 feed (hosted demo): analog Harespod subjects {MAX_SIM['EV1']} (EV1, hypoxic climb) "
                        f"and {MAX_SIM['EV2']} (EV2, calm), as whole-number readings",
                "hr": "Simulated MAX30102 feed (hosted demo): same Harespod subjects",
                "hrv, resp, suit": f"Simulated board (hosted demo): HRV and breathing from NASA crew-state subjects "
                                   f"{MAX_SIM_NASA['EV1']} / {MAX_SIM_NASA['EV2']}; suit pressure and O₂-equivalent altitude "
                                   f"from EV1's climb (suit O₂ regulator fault), nominal 4.3 psia for EV2",
                "reaction": "Simulated HUD reaction check: slows as SpO₂ falls, missed when severe",
                "runtime": "Browser-only demo build: no ESP32 boards; the detector runs on this device",
            },
        },
        "protocols": {p: load_protocol(p) for p in ("hypoxia", "dcs")},
        "dcs_options": DCS_OPTIONS,
        "max": {"EV1": sensor(climb, MAX_SIM_NASA["EV1"], alts, seed=1), "EV2": sensor(calm, MAX_SIM_NASA["EV2"], seed=2)},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB), feed {len(climb)} s, "
          f"baseline {DEMO_TH.baseline_s} s, EV1 alarm at {first_alarm(climb)} s")


if __name__ == "__main__":
    main()
