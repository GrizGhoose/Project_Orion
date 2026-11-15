"""Export everything the browser-only demo build needs into frontend/public/demo/data.json.

The hosted (Vercel) build has no Python server, so the replay streams, protocols and
config are baked into one static file and the detector runs in the browser
(frontend/src/demo/). Re-run this after changing streams, protocols or thresholds:

    cd apps/tablet/backend && .venv/bin/python export_demo.py
"""
import json
from pathlib import Path

from app import streams
from app.config import CREW, SCENARIOS, TH
from app.dcs_model import OPTIONS as DCS_OPTIONS
from app.server import load_protocol

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "demo" / "data.json"
LENGTH = len(streams.hypoxia_stream())


def pack(samples):
    r = lambda v, n: None if not streams.is_finite(v) else round(v, n)  # noqa: E731
    return {
        "spo2": [r(s.spo2, 2) for s in samples],
        "hr": [r(s.hr, 1) for s in samples],
        "hrv": [r(s.hrv, 0) for s in samples],
        "resp": [r(s.resp, 1) for s in samples],
        "suit": [r(s.suit_psia, 3) for s in samples],
        "eq": [r(s.eq_alt_m, 0) for s in samples],
    }


def main():
    data = {
        "config": {
            "crew": CREW,
            "thresholds": TH.__dict__,
            "scenarios": {k: v["label"] for k, v in SCENARIOS.items()},
            "scenario_kinds": {k: {c["id"]: v[c["id"]] for c in CREW} for k, v in SCENARIOS.items()},
            "sources": {**streams.SOURCES, "runtime": "Browser-only demo build: the detector runs on this device"},
        },
        "protocols": {p: load_protocol(p) for p in ("hypoxia", "dcs")},
        "dcs_options": DCS_OPTIONS,
        "length": LENGTH,
        "streams": {
            "hypoxia": pack(streams.hypoxia_stream()),
            "startle": pack(streams.startle_stream(LENGTH)),
            "nominal": pack(streams.nominal_stream(LENGTH)),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
