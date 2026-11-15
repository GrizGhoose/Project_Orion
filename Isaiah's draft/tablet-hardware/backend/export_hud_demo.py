"""Export the hosted tablet demo's time series for the hosted helmet HUD (astronaut-eva-hud/public/demo/frames.json).

The hosted HUD has no tablet backend to link to, so it replays the same simulated MAX30102 feed the hosted
tablet shows (frontend/public/demo/data.json, made by export_demo.py) with the alert level this backend's
detector gives each second: same 10 s baseline, EV1's caution at mission second 20.
Re-run after export_demo.py:

    cd tablet-hardware/backend && .venv/bin/python export_hud_demo.py
"""
import json
from pathlib import Path

from app.detector import HypoxiaDetector
from export_demo import DEMO_TH

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tablet-hardware" / "frontend" / "public" / "demo" / "data.json"
OUT = ROOT / "astronaut-eva-hud" / "public" / "demo" / "frames.json"


def crew_series(feed):
    det = HypoxiaDetector(DEMO_TH)
    out = {"spo2": [], "hr": feed["hr"], "resp": [round(r) for r in feed["rr"]], "level": []}
    for s, h in zip(feed["spo2"], feed["hr"]):
        d = det.update(s, h)
        out["spo2"].append(round(d["spo2_smooth"], 1))
        out["level"].append(d["level"])
    return out


def main():
    data = json.loads(SRC.read_text())
    crew = {cid: crew_series(feed) for cid, feed in data["max"].items()}
    frames = {"eva_start_s": DEMO_TH.baseline_s, "length": len(crew["EV1"]["spo2"]), "crew": crew}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(frames, separators=(",", ":")))
    first = next(t for t, lv in enumerate(crew["EV1"]["level"]) if lv in ("CAUTION", "WARNING"))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB), {frames['length']} s, EV1 first alarm at {first} s")


if __name__ == "__main__":
    main()
