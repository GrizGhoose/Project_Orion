"""NASA tab: the recorded NASA/analog data replayed as a view-only feed beside the live MAX30102 feed.

Each crewmember's recording runs through its own detector, so the NASA tab gets its own baseline
(the first 4 min of the recording) and its own caution/warning levels. Alarms, sound and the
response flow stay on the live sensor feed; nothing here is logged or alarmed.
"""
import random
from collections import deque

from . import streams
from .config import CREW, NASA_REPLAY, NASA_REPLAY_SPEED, TH
from .detector import CALIBRATING, HypoxiaDetector

HISTORY_S = 360


class ReplayTrack:
    def __init__(self, crew, kind, seed):
        self.crew = crew
        self.kind = kind
        self.samples = streams.build(kind, len(streams.hypoxia_stream()))
        self.seed = seed
        self.restart()

    def restart(self):
        self.det = HypoxiaDetector()
        self.rng = random.Random(self.seed)
        self.reaction = None
        self.last = None

    def step(self, i):
        s = self.samples[i]
        d = self.det.update(s.spo2, s.hr)
        if self.det.calibrated and d["signal"] and i % TH.reaction_every_s == 0:
            ms = streams.reaction_time_ms(self.rng, d["z"], d["spo2_smooth"])
            self.reaction = {"ms": ms, "missed": ms is None}
        b = d["baseline"]
        self.last = {
            **self.crew,
            "spo2": round(s.spo2, 1), "spo2_smooth": round(d["spo2_smooth"], 1), "signal": d["signal"],
            "hr": round(s.hr), "hr_delta": round(s.hr - b["hr_mean"]) if b else 0,
            "hrv": round(s.hrv) if streams.is_finite(s.hrv) else None,
            "resp": round(s.resp, 1) if streams.is_finite(s.resp) else None,
            "suit_psia": round(s.suit_psia, 2), "eq_alt_m": round(s.eq_alt_m),
            "level": d["level"], "z": round(d["z"], 2), "hr_z": round(d["hr_z"], 2),
            "baseline": {k: round(v, 2) for k, v in b.items()} if b else None,
            "below_caution_s": d["below_caution_s"], "below_warning_s": d["below_warning_s"],
            "slope_per_min": round(d["slope_per_min"], 2), "startle": d["startle"],
            "reasons": d["reasons"], "calibration_left_s": d["calibration_left_s"],
            "reaction": self.reaction, "acked": False,
            "phase": "PRE-EVA" if d["level"] == CALIBRATING else "EVA", "treated": False,
            "replay": self.kind,
        }
        return self.last


class NasaReplay:
    def __init__(self, speed=NASA_REPLAY_SPEED):
        self.speed = max(1, speed)
        self.tracks = [ReplayTrack(c, NASA_REPLAY[c["id"]], seed=i) for i, c in enumerate(CREW)]
        self.length = min(len(t.samples) for t in self.tracks)
        self.restart()

    def restart(self):
        self.t = 0
        self.history = deque(maxlen=HISTORY_S)
        for tr in self.tracks:
            tr.restart()

    def advance(self):
        """Play `speed` recorded seconds; loop back to the start (new baseline) at the end."""
        points = []
        for _ in range(self.speed):
            if self.t >= self.length:
                self.restart()
            crew = [tr.step(self.t) for tr in self.tracks]
            point = {"t": self.t, "crew": [{"id": c["id"], "spo2": c["spo2_smooth"], "hr": c["hr"],
                                            "level": c["level"]} for c in crew]}
            self.history.append(point)
            points.append(point)
            self.t += 1
        return points

    def frame(self, points):
        return {"t": self.t - 1, "speed": self.speed, "length": self.length, "eva_start_s": TH.baseline_s,
                "crew": [tr.last for tr in self.tracks], "points": points}
