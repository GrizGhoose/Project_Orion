import json

from app import dcs_model, streams
from app.config import PROTOCOL_DIR, TH
from app.detector import CAUTION, WARNING, HypoxiaDetector


def run(samples):
    det = HypoxiaDetector()
    return [det.update(s.spo2, s.hr) for s in samples]


def first(levels, wanted):
    return next((i for i, d in enumerate(levels) if d["level"] in wanted), None)


def test_hypoxia_replay_escalates_caution_then_warning():
    out = run(streams.hypoxia_stream())
    caution, warning = first(out, {CAUTION, WARNING}), first(out, {WARNING})
    assert caution is not None and warning is not None
    assert TH.baseline_s < caution <= warning


def test_no_alarm_during_baseline_altitude():
    out = run(streams.hypoxia_stream())
    assert all(d["level"] not in (CAUTION, WARNING) for d in out[:400])


def test_startle_replay_never_alarms_but_flags_advisory():
    out = run(streams.startle_stream(3080))
    assert first(out, {CAUTION, WARNING}) is None
    assert any(d["startle"] for d in out)


def test_nominal_never_alarms():
    assert first(run(streams.nominal_stream(3080)), {CAUTION, WARNING}) is None


def test_short_spike_does_not_alarm():
    s = streams.nominal_stream(600)
    for k in range(400, 402):  # 2 s spike: the 5 s median never moves
        s[k].spo2 = 80.0
    assert first(run(s), {CAUTION, WARNING}) is None


def test_sustained_dip_alarms_within_seconds():
    # Accepted trade-off of the 5 s / 3 s holds: an 8 s drop alarms (it could be a slipped sensor).
    s = streams.nominal_stream(600)
    for k in range(400, 408):
        s[k].spo2 = 80.0
    hit = first(run(s), {CAUTION, WARNING})
    assert hit is not None and hit - 400 <= 8


def _mission_at_warning():
    from app.sim import Mission
    m = Mission()
    while m.tracks[0].last is None or m.tracks[0].last["level"] != WARNING:
        m.tick()
    return m


def test_emergency_o2_clears_warning():
    m = _mission_at_warning()
    m.treat("EV1")
    for _ in range(120):
        m.tick()
    assert m.tracks[0].last["level"] not in (CAUTION, WARNING)


def test_false_alarm_resolve_realarms_if_still_low():
    m = _mission_at_warning()
    m.resolve("EV1", "False alarm", recover=False)
    m.tick()
    assert m.tracks[0].last["level"] not in (CAUTION, WARNING)
    for _ in range(90):
        m.tick()
    assert m.tracks[0].last["level"] in (CAUTION, WARNING)


def test_dcs_model_matches_nasa_mars_case():
    # TP-2014-218561: pain-only symptom at 203 min, return 4.3 -> 8.2 psia: 0.49 (0.36-0.62)
    p = dcs_model.p_resolution(8.2 - 4.3, 203, True)
    assert 0.36 <= p <= 0.62


def test_protocol_links_resolve():
    for name in ("hypoxia", "dcs"):
        proto = json.loads((PROTOCOL_DIR / f"{name}.json").read_text())
        nodes = proto["nodes"]
        assert proto["start"] in nodes
        for node in nodes.values():
            targets = [node.get("next"), node.get("alt", {}).get("next"), *node.get("next_if", {}).values(),
                       *(o.get("next") for o in node.get("options", [])), *node.get("rules", {}).values()]
            assert all(t in nodes for t in targets if t), (name, node)
