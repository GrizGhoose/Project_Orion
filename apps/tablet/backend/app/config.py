"""Paths, crew roster and detection thresholds. Every tunable number lives here."""
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = Path(os.environ.get("HYPOXIA_DIR", ROOT / "research" / "HYPOXIA"))
DCS_REPORT = DATA_DIR / "sources" / "nasa_dcs_treatment_model_TP-2014-218561.pdf"
PROTOCOL_DIR = Path(__file__).resolve().parents[1] / "protocols"
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@dataclass(frozen=True)
class Thresholds:
    # Personal baseline: mean and SD of SpO2 over the pre-EVA window.
    baseline_s: int = 240
    # Pulse oximeters are accurate to about +/-2 points, so a calm baseline's
    # tiny SD must not turn sensor noise into alarms.
    spo2_sd_floor: float = 1.5
    hr_sd_floor: float = 3.0
    smooth_s: int = 5            # rolling median before the z-score
    grace_s: int = 5             # seconds back above a line before its timer resets

    caution_z: float = -2.0
    caution_hold_s: int = 5
    warning_z: float = -3.0
    warning_hold_s: int = 3

    # Clinical floors, independent of baseline.
    caution_floor: float = 93.0  # for caution_hold_s
    warning_floor: float = 90.0  # for warning_hold_s
    immediate_floor: float = 85.0
    immediate_hold_s: int = 3    # same as warning_hold_s; kept as a separate, explicit floor

    recover_z: float = -1.0
    recover_hold_s: int = 20

    # Startle / exertion: heart rate jumps while SpO2 holds.
    startle_hr_z: float = 2.0
    startle_spo2_z: float = -1.0

    reaction_every_s: int = 120


TH = Thresholds()

CREW = [
    {"id": "EV1", "name": "Crew A", "role": "CDR", "distance_m": 140},
    {"id": "EV2", "name": "Crew B", "role": "MS1", "distance_m": 165},
]

SCENARIOS = {
    "demo": {"label": "Demo: EV1 hypoxia + EV2 startle", "EV1": "hypoxia", "EV2": "startle"},
    "hypoxia": {"label": "EV1 hypoxia only", "EV1": "hypoxia", "EV2": "nominal"},
    "startle": {"label": "EV2 startle only", "EV1": "nominal", "EV2": "startle"},
    "nominal": {"label": "Both nominal", "EV1": "nominal", "EV2": "nominal"},
    "both": {"label": "Test: both crew hypoxic", "EV1": "hypoxia", "EV2": "hypoxia"},
}
