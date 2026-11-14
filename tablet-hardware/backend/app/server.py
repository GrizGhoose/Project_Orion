"""FastAPI server: live sensor input, detector, WebSocket telemetry, protocols, DCS model, event log.

Run from tablet/backend:  uvicorn app.server:app --port 8000
Sensors: each crewmember's ESP32 + MAX30102 (config.SENSOR_URLS), or POST /api/ingest/{crew}.
"""
import asyncio
import csv
import json
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import dcs_model
from .config import CREW, DATA_DIR, FRONTEND_DIST, PROTOCOL_DIR, SENSOR_URLS, TH
from .mission import Mission
from .sensors import SensorLink

mission = Mission()
sensors = {c["id"]: SensorLink(c["id"], SENSOR_URLS.get(c["id"], "")) for c in CREW}
clients: set[WebSocket] = set()

SOURCES = {
    "spo2": "Live: MAX30102 pulse oximeter on the crewmember's ESP32",
    "hr": "Live: MAX30102 (pulse from the red/IR light signal)",
    "hrv, resp, suit": "No sensor fitted; shown when a board sends hrv / rr / suit_psia",
    "nasa tab": "Replay: NASA crew-state HR/HRV/breathing (startle, EV2) and analog Harespod SpO₂ climb (EV1); NASA publishes no open SpO₂ data",
    "thresholds": "Detector timings validated on NASA crew-state and analog Harespod data (tests/)",
    "dcs_model": "NASA TP-2014-218561 Hypobaric DCS Treatment Model (Conkin et al.)",
}


def _facts():
    with open(DATA_DIR / "nasa_hypoxia_evidence_facts.csv", newline="") as f:
        return list(csv.DictReader(f))


FACTS = _facts()


def _resolve_sources(node):
    """Expand {"fact": n} references into the NASA evidence row with its page."""
    for why in node.get("why", []):
        if "fact" in why:
            row = FACTS[why.pop("fact")]
            why["text"] = row["finding"]
            why["source"] = f"NASA NTRS 20150021491, Risk of Hypobaric Hypoxia evidence report, p. {row['source_page']}"
    return node


def load_protocol(pid):
    path = PROTOCOL_DIR / f"{pid}.json"
    if not path.exists():
        raise HTTPException(404, f"No protocol {pid}")
    proto = json.loads(path.read_text())
    for node in proto["nodes"].values():
        _resolve_sources(node)
    return proto


async def broadcast(msg):
    data = json.dumps(msg)
    for ws in list(clients):
        try:
            await ws.send_text(data)
        except Exception:
            clients.discard(ws)


async def run_clock():
    """One detector step per real second, using each sensor's latest fresh reading."""
    loop = asyncio.get_running_loop()
    next_at = loop.time()
    while True:
        readings = {cid: s.current() for cid, s in sensors.items()}
        status = {cid: s.status() for cid, s in sensors.items()}
        frame, new_log = mission.tick(readings, status)
        await broadcast(frame)
        for entry in new_log:
            await broadcast({"type": "log", "entry": entry})
        next_at += 1.0
        await asyncio.sleep(max(0.0, next_at - loop.time()))


@asynccontextmanager
async def lifespan(_app):
    tasks = [asyncio.create_task(run_clock())] + [asyncio.create_task(s.run()) for s in sensors.values()]
    yield
    for t in tasks:
        t.cancel()


app = FastAPI(title="Crew Health tablet backend", lifespan=lifespan)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    await ws.send_text(json.dumps({"type": "history", "frames": list(mission.history), "log": mission.log,
                                   "sessions": mission.sessions, "nasa": list(mission.nasa.history)}))
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        clients.discard(ws)


@app.get("/api/config")
def config():
    return {"crew": CREW, "thresholds": TH.__dict__, "sources": SOURCES}


@app.post("/api/nasa/restart")
async def restart_nasa():
    """Play the NASA tab's recording from the start (new baseline)."""
    mission.nasa.restart()
    await broadcast({"type": "nasa_reset"})
    return {"ok": True}


@app.get("/api/sensors")
def sensor_status():
    return {cid: s.status() for cid, s in sensors.items()}


@app.post("/api/ingest/{crew}")
def ingest(crew: str, body: dict):
    """HTTP alternative to the WebSocket link: a board or bench tool posts one reading per second."""
    if crew not in sensors:
        raise HTTPException(404, f"No crewmember {crew}")
    sensors[crew].accept(body)
    return {"ok": True}


@app.get("/api/protocols/{pid}")
def protocol(pid: str):
    return load_protocol(pid)


@app.get("/api/dcs/options")
def dcs_options(ts_min: float = 180, ambulation: bool = True):
    return dcs_model.options(ts_min, ambulation)


@app.post("/api/baseline/restart")
async def restart_baseline():
    """Start a fresh personal baseline for everyone (e.g. once the sensors are on)."""
    mission.restart()
    mission.sessions.clear()
    await broadcast({"type": "reset", "log": mission.log, "sessions": mission.sessions})
    return {"ok": True}


class Ack(BaseModel):
    crew: str


@app.post("/api/ack")
async def ack(body: Ack):
    mission.ack(body.crew)
    await broadcast({"type": "log", "entry": mission.log[-1]})
    return {"ok": True}


class LogEntry(BaseModel):
    crew: str
    kind: str
    text: str
    extra: dict | None = None


class Resolve(BaseModel):
    crew: str
    reason: str
    recover: bool = True


@app.post("/api/treat")
async def treat(body: Ack):
    entry = mission.treat(body.crew)
    if entry:
        await broadcast({"type": "log", "entry": entry})
    return {"ok": True}


@app.post("/api/resolve")
async def resolve(body: Resolve):
    entry = mission.resolve(body.crew, body.reason, body.recover)
    if entry:
        await broadcast({"type": "log", "entry": entry})
    return {"ok": True}


@app.put("/api/sessions/{protocol}/{crew}")
async def put_session(protocol: str, crew: str, body: dict):
    """Store a response in progress so a reload or a second tablet picks it up."""
    key = f"{protocol}:{crew}"
    mission.sessions[key] = {**body, "protocol": protocol, "crew": crew, "updated": time.time()}
    await broadcast({"type": "session", "key": key, "session": mission.sessions[key]})
    return mission.sessions[key]


@app.delete("/api/sessions/{protocol}/{crew}")
async def delete_session(protocol: str, crew: str):
    key = f"{protocol}:{crew}"
    mission.sessions.pop(key, None)
    await broadcast({"type": "session", "key": key, "session": None})
    return {"ok": True}


@app.post("/api/log")
async def add_log(body: LogEntry):
    entry = mission.add_log(body.crew, body.kind, body.text, body.extra)
    await broadcast({"type": "log", "entry": entry})
    return entry


@app.get("/api/log")
def get_log():
    return mission.log


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = FRONTEND_DIST / path
        return FileResponse(f if path and f.is_file() else FRONTEND_DIST / "index.html")
