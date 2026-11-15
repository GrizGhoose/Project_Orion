"""FastAPI server: WebSocket telemetry, protocols, DCS model, event log.

Run from apps/tablet/backend:  uvicorn app.server:app --port 8000
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

from . import dcs_model, streams
from .config import CREW, DATA_DIR, FRONTEND_DIST, PROTOCOL_DIR, SCENARIOS, TH
from .sim import Mission

mission = Mission()
clients: set[WebSocket] = set()


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
    while True:
        frame, new_log = mission.tick()
        await broadcast(frame)
        for entry in new_log:
            await broadcast({"type": "log", "entry": entry})
        await asyncio.sleep(1.0 / mission.speed)


@asynccontextmanager
async def lifespan(_app):
    task = asyncio.create_task(run_clock())
    yield
    task.cancel()


app = FastAPI(title="Crew Health tablet backend", lifespan=lifespan)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    await ws.send_text(json.dumps({"type": "history", "frames": list(mission.history), "log": mission.log,
                                   "sessions": mission.sessions}))
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        clients.discard(ws)


@app.get("/api/config")
def config():
    return {
        "crew": CREW,
        "thresholds": TH.__dict__,
        "scenarios": {k: v["label"] for k, v in SCENARIOS.items()},
        "sources": streams.SOURCES,
    }


@app.get("/api/protocols/{pid}")
def protocol(pid: str):
    return load_protocol(pid)


@app.get("/api/dcs/options")
def dcs_options(ts_min: float = 180, ambulation: bool = True):
    return dcs_model.options(ts_min, ambulation)


class SimCmd(BaseModel):
    scenario: str | None = None
    speed: float | None = None
    paused: bool | None = None


@app.post("/api/sim")
async def sim(cmd: SimCmd):
    if cmd.scenario:
        if cmd.scenario not in SCENARIOS:
            raise HTTPException(400, "unknown scenario")
        mission.reset(cmd.scenario)
        await broadcast({"type": "reset", "log": mission.log, "sessions": mission.sessions})
    if cmd.speed:
        mission.speed = max(0.5, min(cmd.speed, 50.0))
    if cmd.paused is not None:
        mission.paused = cmd.paused
    return {"scenario": mission.scenario, "speed": mission.speed, "paused": mission.paused}


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
