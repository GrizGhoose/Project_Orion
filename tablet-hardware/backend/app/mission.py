"""Mission state: runs each crewmember's live sensor readings through the detector, once a second."""
from datetime import datetime, timezone

from collections import deque

from .config import CREW, TH
from .detector import ADVISORY, CALIBRATING, RANK, HypoxiaDetector
from .replay import NasaReplay

HISTORY_S = 360


class CrewTrack:
    def __init__(self, crew):
        self.crew = crew
        self.det = HypoxiaDetector()
        self.acked_level = None
        self.last = None

    def step(self, reading, sensor_status):
        r = reading or {}
        d = self.det.update(r.get("spo2"), r.get("hr"))
        if RANK[d["level"]] < RANK.get(self.acked_level or "NOMINAL", 0):
            self.acked_level = None
        hr = r.get("hr")
        hr_delta = hr - d["baseline"]["hr_mean"] if d["baseline"] and hr is not None else 0.0
        rt = r.get("reaction_ms")
        self.last = {
            **self.crew,
            "spo2": r.get("spo2"), "spo2_smooth": round(d["spo2_smooth"], 1), "signal": d["signal"],
            "hr": round(hr) if hr is not None else None, "hr_delta": round(hr_delta),
            # Values the MAX30102 cannot measure stay None ("No sensor") unless a board sends them.
            "hrv": r.get("hrv"), "resp": r.get("rr"), "suit_psia": r.get("suit_psia"), "eq_alt_m": None,
            "level": d["level"], "z": round(d["z"], 2), "hr_z": round(d["hr_z"], 2),
            "baseline": {k: round(v, 2) for k, v in d["baseline"].items()} if d["baseline"] else None,
            "below_caution_s": d["below_caution_s"], "below_warning_s": d["below_warning_s"],
            "slope_per_min": round(d["slope_per_min"], 2), "startle": d["startle"],
            "reasons": d["reasons"], "calibration_left_s": d["calibration_left_s"],
            "reaction": {"ms": rt, "missed": False} if rt is not None else None,
            "acked": self.acked_level == d["level"],
            "phase": "PRE-EVA" if d["level"] == CALIBRATING else "EVA",
            "treated": False,
            "sensor": sensor_status,
        }
        return self.last


class Mission:
    def __init__(self):
        self.log = []
        self.sessions = {}  # "protocol:crew" -> response in progress, shared by every tablet
        self.nasa = NasaReplay()  # NASA tab: view-only replay of the recorded data
        self.restart(log=False)

    def restart(self, log=True):
        """New baseline for everyone: mission clock back to 0, detectors start calibrating again."""
        self.t = 0
        self.tracks = [CrewTrack(c) for c in CREW]
        self.history = deque(maxlen=HISTORY_S)
        self.levels = {c["id"]: None for c in CREW}
        self.last_advisory_log = {}
        if log:
            self.add_log("SYSTEM", "sim", "Baseline restarted: recording each crewmember's personal baseline")

    def add_log(self, crew, kind, text, extra=None):
        entry = {"utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "met_s": self.t,
                 "crew": crew, "kind": kind, "text": text}
        if extra:
            entry["extra"] = extra
        self.log.append(entry)
        return entry

    def _track(self, crew_id):
        return next((tr for tr in self.tracks if tr.crew["id"] == crew_id), None)

    def ack(self, crew_id):
        tr = self._track(crew_id)
        if tr and tr.last:
            tr.acked_level = tr.last["level"]
            tr.last["acked"] = True
            return self.add_log(crew_id, "ack", f"{tr.last['level'].title()} acknowledged on tablet")

    def treat(self, crew_id):
        if self._track(crew_id):
            return self.add_log(crew_id, "treat", "Emergency O₂ started per response checklist")

    def resolve(self, crew_id, reason, recover):
        """Crew ends the alert. 'Vitals stable' gets 60 s of quiet unless SpO₂ worsens; a false alarm gets none."""
        tr = self._track(crew_id)
        if not tr:
            return None
        tr.det.resolve(grace_s=60 if recover else 0)
        tr.acked_level = None
        return self.add_log(crew_id, "resolve", f"Alert resolved by crew: {reason}")

    def tick(self, readings, sensor_status):
        """Advance one mission second with the latest reading per crewmember (None = no signal)."""
        new_log = []
        crew = []
        for tr in self.tracks:
            cid = tr.crew["id"]
            c = tr.step(readings.get(cid), sensor_status.get(cid))
            crew.append(c)
            prev = self.levels[cid]
            quiet_advisory = ADVISORY in (prev, c["level"]) and RANK[c["level"]] <= RANK[ADVISORY] and \
                self.t - self.last_advisory_log.get(cid, -999) < 60
            if prev not in (None, CALIBRATING) and c["level"] != prev and not quiet_advisory:
                if c["level"] == ADVISORY or prev == ADVISORY:
                    self.last_advisory_log[cid] = self.t
                text = f"{prev.title()} → {c['level'].title()}. SpO₂ {c['spo2_smooth']:.0f} %, z {c['z']:+.1f}. {c['reasons'][0]}"
                new_log.append(self.add_log(cid, "alert", text, {"level": c["level"]}))
            if prev == CALIBRATING and c["level"] != CALIBRATING:
                b = c["baseline"]
                new_log.append(self.add_log(cid, "baseline",
                                            f"Baseline set: SpO₂ {b['spo2_mean']:.1f} ± {b['spo2_sd']:.1f} %, HR {b['hr_mean']:.0f} bpm"))
            self.levels[cid] = c["level"]
        # Seconds without a reading are stored as None so the charts show a gap, not a fake 0 %.
        self.history.append({"t": self.t, "crew": [{"id": c["id"], "spo2": c["spo2_smooth"] if c["signal"] else None,
                                                     "hr": c["hr"], "level": c["level"]} for c in crew]})
        frame = {"type": "frame", "t": self.t, "eva_start_s": TH.baseline_s, "crew": crew,
                 "nasa": self.nasa.frame(self.nasa.advance())}
        self.t += 1
        return frame, new_log
