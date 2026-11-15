"""Live-sensor mission: readings in, alerts and log out."""
from app.config import TH
from app.mission import Mission
from app.sensors import SensorLink

OK = {"connected": True}


def feed(m, n, spo2, hr=80.0, crew="EV1"):
    frame = None
    for _ in range(n):
        reading = {"spo2": spo2, "hr": hr} if spo2 is not None else None
        frame, _ = m.tick({crew: reading}, {crew: OK})
    return {c["id"]: c for c in frame["crew"]}


def test_baseline_then_live_drop_raises_caution_then_warning():
    m = Mission()
    c = feed(m, TH.baseline_s + 1, 98.0)
    assert c["EV1"]["level"] == "NOMINAL" and c["EV1"]["baseline"]["spo2_mean"] == 98.0
    c = feed(m, 10, 94.5)
    assert c["EV1"]["level"] == "CAUTION"
    c = feed(m, 10, 91.0)
    assert c["EV1"]["level"] == "WARNING"
    assert any(e["kind"] == "alert" and e["extra"]["level"] == "WARNING" for e in m.log)


def test_crewmember_without_a_sensor_shows_no_signal_and_never_alarms():
    m = Mission()
    c = feed(m, TH.baseline_s + 30, 98.0)
    ev2 = c["EV2"]
    assert ev2["signal"] is False and ev2["level"] == "CALIBRATING"
    assert ev2["spo2"] is None and ev2["hr"] is None and ev2["suit_psia"] is None


def test_values_the_max30102_cannot_measure_stay_empty():
    m = Mission()
    c = feed(m, 5, 98.0)
    assert c["EV1"]["resp"] is None and c["EV1"]["hrv"] is None and c["EV1"]["suit_psia"] is None


def test_sensor_dropout_mid_eva_gives_no_signal_advisory_not_alarm():
    m = Mission()
    feed(m, TH.baseline_s + 1, 98.0)
    c = feed(m, 8, None)
    assert c["EV1"]["level"] == "ADVISORY" and c["EV1"]["signal"] is False


def test_resolve_vitals_stable_quiet_and_false_alarm_realarms():
    m = Mission()
    feed(m, TH.baseline_s + 1, 98.0)
    feed(m, 20, 91.0)
    m.resolve("EV1", "Vitals stable, resolved", recover=True)
    assert feed(m, 20, 91.0)["EV1"]["level"] not in ("CAUTION", "WARNING")
    m.resolve("EV1", "False alarm", recover=False)
    assert feed(m, 10, 91.0)["EV1"]["level"] == "WARNING"


def test_restart_baseline_resets_clock_and_detectors():
    m = Mission()
    feed(m, TH.baseline_s + 5, 98.0)
    m.restart()
    assert m.t == 0
    assert feed(m, 1, 98.0)["EV1"]["level"] == "CALIBRATING"


def test_sensor_link_marks_flagged_and_invalid_readings_as_no_signal():
    s = SensorLink("EV1", "")
    s.accept({"crew": "EV1", "spo2": 97, "hr": 75, "signal": True})
    assert s.current()["spo2"] == 97 and s.current()["hr"] == 75
    s.accept({"crew": "EV1", "spo2": 97, "hr": 75, "signal": False})
    assert s.current()["spo2"] is None
    s.accept({"crew": "EV1", "spo2": "bad", "hr": float("nan")})
    assert s.current()["spo2"] is None and s.current()["hr"] is None


def test_history_leaves_gaps_for_seconds_without_a_reading():
    m = Mission()
    feed(m, 3, None)
    feed(m, 3, 97.0)
    ev1 = [p for f in m.history for p in f["crew"] if p["id"] == "EV1"]
    assert [p["spo2"] for p in ev1[:3]] == [None, None, None]
    assert all(p["spo2"] is not None for p in ev1[3:])


def test_nasa_tab_replays_the_recording_with_its_own_baseline():
    from app.replay import NasaReplay
    r = NasaReplay(speed=1)
    levels = []
    for _ in range(1300):
        frame = r.frame(r.advance())
        levels.append(frame["crew"][0]["level"])
    assert levels[TH.baseline_s - 1] == "CALIBRATING" and levels[TH.baseline_s + 5] == "NOMINAL"
    assert levels.index("CAUTION") == 799 and levels.index("WARNING") == 1211  # same as the backup demo


def test_nasa_tab_does_not_log_or_affect_the_live_alarms():
    m = Mission()
    for _ in range(300):
        frame, new_log = m.tick({}, {})
        assert not new_log or all(e["crew"] == "SYSTEM" for e in new_log)
    assert frame["nasa"]["crew"][0]["replay"] == "hypoxia"
    assert all(c["level"] == "CALIBRATING" for c in frame["crew"])  # no sensor: live view still waiting
