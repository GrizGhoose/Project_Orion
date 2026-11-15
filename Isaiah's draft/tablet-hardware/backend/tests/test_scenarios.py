"""Detector validation on NASA crew-state and analog Harespod data, plus protocol and DCS model checks.

The live app reads sensors; these replays are the evidence behind its thresholds (Validity slide)."""
import json
import math
import random

import pytest

from app import dcs_model, streams
from app.config import PROTOCOL_DIR, TH
from app.detector import CAUTION, WARNING, HypoxiaDetector

ALARM = {CAUTION, WARNING}


def run(spo2, hr=None):
    det = HypoxiaDetector()
    hr = hr or [80.0] * len(spo2)
    return [det.update(s, h) for s, h in zip(spo2, hr)]


def first(out, levels, start=0):
    return next((i for i, d in enumerate(out) if i >= start and d["level"] in levels), None)


def calm(n, mean=98.0, seed=0):
    rng = random.Random(seed)
    return [mean + rng.gauss(0, 0.4) for _ in range(n)]


def test_A1_nominal_never_alarms():
    out = run([s.spo2 for s in streams.nominal_stream(3080)], [s.hr for s in streams.nominal_stream(3080)])
    assert first(out, ALARM) is None


def test_A2_hypoxia_caution_then_warning():
    ss = streams.hypoxia_stream()
    out = run([s.spo2 for s in ss], [s.hr for s in ss])
    c, w = first(out, ALARM), first(out, {WARNING})
    print(f"A2 caution at {c} s, warning at {w} s")
    assert c is not None and w is not None and TH.baseline_s < c < w


def test_A3_startle_never_alarms():
    ss = streams.startle_stream(3080)
    out = run([s.spo2 for s in ss], [s.hr for s in ss])
    assert first(out, ALARM) is None
    assert sum(d["startle"] for d in out) > 0


def test_A4_low_baseline_still_caught_by_floors():
    out = run(calm(600, mean=91.0))
    c = first(out, ALARM)
    print(f"A4 first alarm at {c} s (baseline ends {TH.baseline_s} s)")
    assert c is not None and c <= TH.baseline_s + 10


def test_A5_spike_ignored_dip_alarms():
    spike = calm(600); spike[400:402] = [80.0, 80.0]
    dip = calm(600); dip[400:408] = [80.0] * 8
    assert first(run(spike), ALARM) is None
    hit = first(run(dip), ALARM)
    print(f"A5 8 s dip alarmed {hit - 400} s after onset")
    assert hit is not None


def test_A6_crash_below_85_warns_fast():
    s = calm(600); s[400:] = [82.0] * 200
    w = first(run(s), {WARNING})
    print(f"A6 warning {w - 400} s after the crash")
    assert w is not None and w - 400 <= 6


def test_A7_alert_holds_until_20s_near_baseline():
    s = calm(800); s[400:500] = [85.0] * 100
    out = run(s)
    assert out[499]["level"] == WARNING
    cleared = next(i for i in range(500, 800) if out[i]["level"] not in ALARM)
    print(f"A7 cleared {cleared - 500} s after SpO2 returned")
    assert TH.recover_hold_s <= cleared - 500 <= TH.recover_hold_s + 8


def test_A8_sensor_dropout_does_not_crash_or_alarm():
    s = calm(600)
    for k in range(400, 420):
        s[k] = None
    out = run(s)  # must not raise
    assert first(out, ALARM, start=400) is None




def _proto(name):
    return json.loads((PROTOCOL_DIR / f"{name}.json").read_text())


def _edges(node):
    return [t for t in [node.get("next"), node.get("alt", {}).get("next"), *node.get("next_if", {}).values(),
                        *(o.get("next") for o in node.get("options", [])), *node.get("rules", {}).values()] if t]


@pytest.mark.parametrize("name", ["hypoxia", "dcs"])
def test_C2_every_step_reachable_and_every_path_ends(name):
    p = _proto(name)
    nodes = p["nodes"]
    seen, todo = set(), [p["start"]]
    while todo:
        n = todo.pop()
        if n not in seen:
            seen.add(n)
            todo += _edges(nodes[n])
    assert seen == set(nodes), f"unreachable: {set(nodes) - seen}"
    can_end = {k for k, v in nodes.items() if v["type"] == "end"}
    changed = True
    while changed:
        changed = False
        for k, v in nodes.items():
            if k not in can_end and any(t in can_end for t in _edges(v)):
                can_end.add(k)
                changed = True
    assert can_end == set(nodes), f"dead ends: {set(nodes) - can_end}"








def test_D6_dcs_model_matches_paper_and_depends_on_onset():
    assert abs(dcs_model.p_resolution(3.9, 203) - 0.49) < 0.05
    ps = [dcs_model.p_resolution(3.9, ts) for ts in (0, 60, 120, 240, 360)]
    assert all(a > b for a, b in zip(ps, ps[1:]))
    assert dcs_model.p_resolution(11.9, 203) > dcs_model.p_resolution(3.9, 203)






def test_F2_suit_pressure_physics():
    sea = streams.suit_psia_for_altitude(0)
    high = streams.suit_psia_for_altitude(4500)
    print(f"F2 sea-level equivalent {sea:.2f} psia, 4500 m equivalent {high:.2f} psia")
    assert sea <= streams.SUIT_NOMINAL_PSIA  # nominal suit is at least as good as sea level
    assert 2.3 < high < 2.7
    alts = [0, 1000, 2000, 3000, 4000]
    ps = [streams.suit_psia_for_altitude(a) for a in alts]
    assert all(a > b for a, b in zip(ps, ps[1:]))


def test_C4_vitals_stable_grace_quiet_unless_worse():
    det = HypoxiaDetector()
    for v in calm(400):
        det.update(v, 80)
    for _ in range(20):
        d = det.update(89.0, 80)
    assert d["level"] == WARNING
    det.resolve(grace_s=60)
    held = [det.update(89.0, 80)["level"] for _ in range(20)]       # steady: stays quiet
    worse = [det.update(84.0, 80)["level"] for _ in range(10)]      # falls below the resolve point
    hit = next((i for i, lv in enumerate(worse) if lv in ALARM), None)
    print(f"C4 grace: quiet for 20 s at the resolve level; re-alarmed {hit} s after SpO2 got worse")
    assert all(lv not in ALARM for lv in held)
    assert hit is not None and hit <= 6

    det2 = HypoxiaDetector()
    for v in calm(400):
        det2.update(v, 80)
    for _ in range(20):
        det2.update(89.0, 80)
    det2.resolve(grace_s=60)
    after = [det2.update(89.0, 80)["level"] for _ in range(70)]
    assert all(lv not in ALARM for lv in after[:59]) and after[-1] in ALARM  # still low when grace ends


def test_A8_dropout_raises_no_signal_advisory_and_keeps_active_alert():
    s = calm(600)
    for k in range(400, 420):
        s[k] = None
    out = run(s)
    assert out[410]["level"] == "ADVISORY" and not out[410]["signal"]
    assert "No SpO₂ signal" in out[410]["reasons"][0]
    # an alert already active stays active through a gap
    s = calm(700); s[400:500] = [85.0] * 100
    for k in range(500, 520):
        s[k] = None
    out = run(s)
    assert out[510]["level"] == WARNING
