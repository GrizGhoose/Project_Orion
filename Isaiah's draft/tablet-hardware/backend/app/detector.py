"""Deviation-duration hypoxia detector.

Each crewmember gets a personal baseline (mean, SD) from the pre-EVA window.
After that, every second:
  z = (median of last 5 s of SpO2 - baseline mean) / baseline SD
and the detector counts how long z has stayed below each line. An alert needs
both depth (how far below the mean) and duration (how long it stayed there),
so a single noisy reading never alarms. Clinical floors back this up for
crewmembers whose baseline is unusual.
"""
import math
import statistics
from collections import deque

from .config import TH

NOMINAL, ADVISORY, CAUTION, WARNING, CALIBRATING = "NOMINAL", "ADVISORY", "CAUTION", "WARNING", "CALIBRATING"
RANK = {CALIBRATING: 0, NOMINAL: 0, ADVISORY: 1, CAUTION: 2, WARNING: 3}


class _Timer:
    """Seconds a condition has held, tolerating short gaps (grace)."""

    def __init__(self, grace):
        self.grace, self.held, self.gap = grace, 0, 0

    def update(self, cond):
        if cond:
            self.held += 1
            self.gap = 0
        else:
            self.gap += 1
            if self.gap > self.grace:
                self.held = 0
        return self.held


class HypoxiaDetector:
    def __init__(self, th=TH):
        self.th = th
        self.t = 0
        self.cal_spo2, self.cal_hr = [], []
        self.mu = self.sd = self.hr_mu = self.hr_sd = None
        self.window = deque(maxlen=th.smooth_s)
        self.trend = deque(maxlen=30)
        self.below_caution = _Timer(th.grace_s)
        self.below_warning = _Timer(th.grace_s)
        self.below_93 = _Timer(th.grace_s)
        self.below_90 = _Timer(th.grace_s)
        self.below_85 = _Timer(0)
        self.recovered = 0
        self.latched = NOMINAL
        self.dropout = 0          # seconds in a row with no SpO2 reading
        self.last_hr = None
        self.last_out = None
        self.grace_left = 0       # seconds of quiet after the crew resolves an alert
        self.grace_ref = None

    def resolve(self, grace_s=0):
        """Crew cleared the alert. Timers restart, so a drop that is still real re-alarms.

        With grace_s (crew says vitals are stable and recovering), alarms stay quiet for that long
        unless SpO2 falls below where it was at the resolve, or under the immediate floor.
        """
        for timer in (self.below_caution, self.below_warning, self.below_93, self.below_90, self.below_85):
            timer.held = timer.gap = 0
        self.recovered = 0
        self.latched = NOMINAL
        self.grace_left = grace_s
        self.grace_ref = statistics.median(self.window) if self.window else None

    def _no_signal(self):
        """SpO2 missing: hold the timers, keep any active alert, never raise a hypoxia alarm from a gap."""
        out = dict(self.last_out) if self.last_out else {
            "level": CALIBRATING, "spo2_smooth": 0.0, "z": 0.0, "hr_z": 0.0, "baseline": None,
            "below_caution_s": 0, "below_warning_s": 0, "slope_per_min": 0.0, "startle": False,
            "calibration_left_s": self.th.baseline_s}
        if out["level"] not in (CAUTION, WARNING, CALIBRATING) and self.dropout >= 5:
            out["level"] = ADVISORY
        out["startle"] = False
        out["signal"] = False
        out["reasons"] = [f"No SpO₂ signal for {self.dropout} s: check the forehead sensor"]
        return out

    @property
    def calibrated(self):
        return self.mu is not None

    def _calibrate(self):
        self.mu = statistics.fmean(self.cal_spo2)
        self.sd = max(statistics.pstdev(self.cal_spo2), self.th.spo2_sd_floor)
        self.hr_mu = statistics.fmean(self.cal_hr)
        self.hr_sd = max(statistics.pstdev(self.cal_hr), self.th.hr_sd_floor)

    def update(self, spo2, hr):
        th = self.th
        self.t += 1
        if hr is None or (isinstance(hr, float) and math.isnan(hr)):
            hr = self.last_hr if self.last_hr is not None else 80.0
        self.last_hr = hr
        if spo2 is None or (isinstance(spo2, float) and math.isnan(spo2)):
            self.dropout += 1
            return self._no_signal()
        self.dropout = 0
        self.window.append(spo2)
        smooth = statistics.median(self.window)
        self.trend.append(smooth)

        if not self.calibrated:
            self.cal_spo2.append(spo2)
            self.cal_hr.append(hr)
            if len(self.cal_spo2) >= th.baseline_s:
                self._calibrate()
            self.last_out = {
                "level": CALIBRATING, "spo2_smooth": smooth, "z": 0.0, "hr_z": 0.0,
                "baseline": None, "below_caution_s": 0, "below_warning_s": 0,
                "slope_per_min": 0.0, "startle": False, "signal": True,
                "reasons": [f"Recording personal baseline: {th.baseline_s - len(self.cal_spo2)} s left"],
                "calibration_left_s": th.baseline_s - len(self.cal_spo2),
            }
            return self.last_out

        z = (smooth - self.mu) / self.sd
        hr_z = (hr - self.hr_mu) / self.hr_sd
        bc = self.below_caution.update(z <= th.caution_z)
        bw = self.below_warning.update(z <= th.warning_z)
        b93 = self.below_93.update(smooth < th.caution_floor)
        b90 = self.below_90.update(smooth < th.warning_floor)
        b85 = self.below_85.update(smooth < th.immediate_floor)
        slope = (self.trend[-1] - self.trend[0]) * 60 / max(len(self.trend) - 1, 1)

        reasons = []
        level = NOMINAL
        if b85 >= th.immediate_hold_s:
            level = WARNING
            reasons.append(f"SpO₂ {smooth:.0f} % is below the {th.immediate_floor:.0f} % floor")
        if bw >= th.warning_hold_s:
            level = WARNING
            reasons.append(f"{z:+.1f} σ from baseline for {bw} s (warning: {th.warning_z:+.0f} σ for {th.warning_hold_s} s)")
        if b90 >= th.warning_hold_s:
            level = WARNING
            reasons.append(f"SpO₂ under {th.warning_floor:.0f} % for {b90} s")
        if level != WARNING:
            if bc >= th.caution_hold_s:
                level = CAUTION
                reasons.append(f"{z:+.1f} σ from baseline for {bc} s (caution: {th.caution_z:+.0f} σ for {th.caution_hold_s} s)")
            if b93 >= th.caution_hold_s:
                level = CAUTION
                reasons.append(f"SpO₂ under {th.caution_floor:.0f} % for {b93} s")

        # Latch: an alert stays until SpO2 has been back near baseline for a while.
        if z > th.recover_z and smooth >= th.caution_floor:
            self.recovered += 1
        else:
            self.recovered = 0
        if RANK[level] >= RANK[self.latched]:
            self.latched = level
        elif self.latched in (CAUTION, WARNING) and self.recovered < th.recover_hold_s:
            reasons.append(f"Holding {self.latched.lower()} until SpO₂ is back near baseline for {th.recover_hold_s} s "
                           f"({self.recovered} s so far)")
        else:
            self.latched = level

        startle = hr_z >= th.startle_hr_z and z > th.startle_spo2_z
        if startle and self.latched == NOMINAL:
            self.latched = ADVISORY
        if self.latched == ADVISORY and not startle:
            self.latched = NOMINAL
        if startle:
            reasons.append(f"HR {hr - self.hr_mu:+.0f} bpm with SpO₂ holding: startle or exertion, no hypoxia alarm")
        if not reasons:
            reasons.append(f"SpO₂ within {abs(z):.1f} σ of personal baseline")

        if self.grace_left > 0:
            self.grace_left -= 1
            floor = self.grace_ref - 1.0
            if smooth < floor or smooth < th.immediate_floor:
                self.grace_left = 0  # getting worse: normal alarms resume now
            elif self.latched in (CAUTION, WARNING):
                self.latched = NOMINAL
                reasons = [f"Resolved by crew, watching recovery for {self.grace_left} s more; "
                           f"alarms again if SpO₂ drops below {floor:.0f} %"]

        self.last_out = {
            "level": self.latched, "spo2_smooth": smooth, "z": z, "hr_z": hr_z,
            "baseline": {"spo2_mean": self.mu, "spo2_sd": self.sd, "hr_mean": self.hr_mu, "hr_sd": self.hr_sd},
            "below_caution_s": bc, "below_warning_s": bw,
            "slope_per_min": slope, "startle": startle, "reasons": reasons,
            "calibration_left_s": 0, "signal": True,
        }
        return self.last_out
