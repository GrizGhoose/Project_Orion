"""Mission simulator: replays both EVA crewmembers' streams through the detector."""
import math
import random
from collections import deque
from datetime import datetime, timezone

from . import streams
from .config import CREW, SCENARIOS, TH
from .detector import ADVISORY, CALIBRATING, RANK, HypoxiaDetector

HISTORY_S = 360
# After emergency O2: suit pressure restores in seconds, blood O2 over about a minute.
SUIT_TAU_S = 5.0
SPO2_TAU_S = 20.0


class CrewTrack:
    def __init__(self, crew, kind, length, seed):
        self.crew = crew
        self.kind = kind
        self.samples = streams.build(kind, length)
        self.det = HypoxiaDetector()
        self.rng = random.Random(seed)
        self.reaction = None
        self.acked_level = None
        self.last = None
        self.treated_at = None
        self.treat_from = None

    def treat(self, t):
        """Emergency O2 is on: from now the replay is replaced by a recovery curve."""
        if self.treated_at is None:
            self.treated_at = t
            self.treat_from = self.last

    def _sample(self, t):
        s = self.samples[min(t, len(self.samples) - 1)]
        if self.treated_at is None or not self.det.calibrated or not self.treat_from:
            return s
        f, dt = self.treat_from, t - self.treated_at
        k_spo2 = 1 - math.exp(-dt / SPO2_TAU_S)
        k_suit = 1 - math.exp(-dt / SUIT_TAU_S)
        return streams.Sample(
            spo2=f["spo2_smooth"] + (self.det.mu - f["spo2_smooth"]) * k_spo2 + self.rng.gauss(0, 0.25),
            hr=f["hr"] + (self.det.hr_mu - f["hr"]) * k_spo2,
            hrv=s.hrv, resp=s.resp,
            suit_psia=f["suit_psia"] + (streams.SUIT_NOMINAL_PSIA - f["suit_psia"]) * k_suit + self.rng.gauss(0, 0.01),
            eq_alt_m=f["eq_alt_m"] * (1 - k_suit),
            truth="recovering",
        )

    def step(self, t):
        s = self._sample(t)
        d = self.det.update(s.spo2, s.hr)
        if self.det.calibrated and t % TH.reaction_every_s == 0:
            ms = streams.reaction_time_ms(self.rng, d["z"], d["spo2_smooth"])
            self.reaction = {"t": t, "ms": ms, "missed": ms is None}
        if RANK[d["level"]] < RANK.get(self.acked_level or "NOMINAL", 0):
            self.acked_level = None
        hr_delta = s.hr - d["baseline"]["hr_mean"] if d["baseline"] else 0.0
        self.last = {
            **self.crew,
            "spo2": round(s.spo2, 1), "spo2_smooth": round(d["spo2_smooth"], 1),
            "hr": round(s.hr), "hr_delta": round(hr_delta),
            "hrv": round(s.hrv) if streams.is_finite(s.hrv) else None,
            "resp": round(s.resp, 1) if streams.is_finite(s.resp) else None,
            "suit_psia": round(s.suit_psia, 2), "eq_alt_m": round(s.eq_alt_m),
            "level": d["level"], "z": round(d["z"], 2), "hr_z": round(d["hr_z"], 2),
            "baseline": {k: round(v, 2) for k, v in d["baseline"].items()} if d["baseline"] else None,
            "below_caution_s": d["below_caution_s"], "below_warning_s": d["below_warning_s"],
            "slope_per_min": round(d["slope_per_min"], 2), "startle": d["startle"],
            "reasons": d["reasons"], "calibration_left_s": d["calibration_left_s"],
            "reaction": self.reaction, "acked": self.acked_level == d["level"],
            "phase": "PRE-EVA" if d["level"] == CALIBRATING else "EVA",
            "treated": self.treated_at is not None,
        }
        return self.last


class Mission:
    def __init__(self):
        self.speed = 5.0
        self.paused = False
        self.log = []
        self.reset("demo")

    def reset(self, scenario):
        self.scenario = scenario
        cfg = SCENARIOS[scenario]
        length = len(streams.hypoxia_stream()) if "hypoxia" in cfg.values() else 3080
        self.length = length
        self.t = 0
        self.tracks = [CrewTrack(c, cfg[c["id"]], length, seed=i) for i, c in enumerate(CREW)]
        self.history = deque(maxlen=HISTORY_S)
        self.levels = {c["id"]: None for c in CREW}
        self.last_advisory_log = {}
        self.add_log("SYSTEM", "sim", f"Scenario loaded: {cfg['label']}")

    def add_log(self, crew, kind, text, extra=None):
        entry = {"utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "met_s": self.t,
                 "crew": crew, "kind": kind, "text": text}
        if extra:
            entry["extra"] = extra
        self.log.append(entry)
        return entry

    def ack(self, crew_id):
        for tr in self.tracks:
            if tr.crew["id"] == crew_id and tr.last:
                tr.acked_level = tr.last["level"]
                tr.last["acked"] = True
                self.add_log(crew_id, "ack", f"{tr.last['level'].title()} acknowledged on tablet")

    def _track(self, crew_id):
        return next((tr for tr in self.tracks if tr.crew["id"] == crew_id), None)

    def treat(self, crew_id):
        tr = self._track(crew_id)
        if tr and tr.treated_at is None:
            tr.treat(self.t)
            return self.add_log(crew_id, "treat", "Emergency O₂ on. Vitals should recover within about a minute")

    def resolve(self, crew_id, reason, recover):
        """Crew ends the alert. With recover=False (e.g. false alarm) a still-low SpO₂ re-alarms."""
        tr = self._track(crew_id)
        if not tr:
            return None
        if recover:
            tr.treat(self.t)
        tr.det.resolve()
        tr.acked_level = None
        return self.add_log(crew_id, "resolve", f"Alert resolved by crew: {reason}")

    def tick(self):
        """Advance one second of mission time. Returns (frame, new log entries)."""
        if self.t >= self.length - 1:
            self.paused = True
        new_log = []
        crew = []
        for tr in self.tracks:
            c = tr.step(self.t)
            crew.append(c)
            prev = self.levels[c["id"]]
            quiet_advisory = ADVISORY in (prev, c["level"]) and RANK[c["level"]] <= RANK[ADVISORY] and \
                self.t - self.last_advisory_log.get(c["id"], -999) < 60
            if prev not in (None, CALIBRATING) and c["level"] != prev and not quiet_advisory:
                if c["level"] == ADVISORY or prev == ADVISORY:
                    self.last_advisory_log[c["id"]] = self.t
                text = f"{prev.title()} → {c['level'].title()}. SpO₂ {c['spo2_smooth']:.0f} %, z {c['z']:+.1f}. {c['reasons'][0]}"
                new_log.append(self.add_log(c["id"], "alert", text, {"level": c["level"]}))
            if prev == CALIBRATING and c["level"] != CALIBRATING:
                b = c["baseline"]
                new_log.append(self.add_log(c["id"], "baseline",
                                            f"Baseline set: SpO₂ {b['spo2_mean']:.1f} ± {b['spo2_sd']:.1f} %, HR {b['hr_mean']:.0f} bpm"))
            self.levels[c["id"]] = c["level"]
        frame = {"type": "frame", "t": self.t, "speed": self.speed, "paused": self.paused,
                 "scenario": self.scenario, "length": self.length, "crew": crew}
        self.history.append({"t": self.t, "crew": [{"id": c["id"], "spo2": c["spo2_smooth"], "hr": c["hr"],
                                                     "level": c["level"]} for c in crew]})
        if not self.paused:
            self.t += 1
        return frame, new_log
