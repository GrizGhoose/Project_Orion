"""Live sensor input: one ESP32 + MAX30102 per crewmember.

Each board runs a WebSocket server and broadcasts one JSON reading per second
(hardware/esp32_crewhealth), for example:
    {"crew": "EV1", "seq": 812, "t_ms": 812345, "spo2": 97, "hr": 78, "signal": true}
Optional keys a board may add later: "rr", "hrv", "suit_psia", "reaction_ms".
A board (or any test tool) can also POST the same JSON to /api/ingest/{crew}.
"""
import asyncio
import json
import math
import time

import websockets

from .config import SENSOR_STALE_S

FIELDS = ("spo2", "hr", "rr", "hrv", "suit_psia", "reaction_ms")


def _num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) else None


class SensorLink:
    """Latest reading from one crewmember's sensor, plus connection status."""

    def __init__(self, crew_id, url):
        self.crew_id = crew_id
        self.url = url
        self.connected = False
        self.latest = None
        self.received_at = None
        self.error = None

    def accept(self, msg):
        """Store a reading. Values that are missing, invalid or flagged no-signal become None."""
        reading = {k: _num(msg.get(k)) for k in FIELDS}
        if msg.get("signal") is False:
            reading["spo2"] = reading["hr"] = None
        self.latest = reading
        self.received_at = time.monotonic()

    def current(self):
        """The reading if fresh, else None (treated by the detector as no signal)."""
        if self.received_at is None or time.monotonic() - self.received_at > SENSOR_STALE_S:
            return None
        return self.latest

    def status(self):
        age = None if self.received_at is None else round(time.monotonic() - self.received_at, 1)
        return {"url": self.url, "connected": self.connected, "age_s": age, "error": self.error}

    async def run(self):
        """Keep a WebSocket connection to the board open; retry every 2 s."""
        if not self.url:
            return
        while True:
            try:
                async with websockets.connect(self.url, open_timeout=3, ping_interval=5) as ws:
                    self.connected, self.error = True, None
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                        except ValueError:
                            continue
                        if isinstance(msg, dict) and msg.get("crew", self.crew_id) == self.crew_id:
                            self.accept(msg)
            except asyncio.CancelledError:
                raise
            except Exception as e:  # board off, wrong address, Wi-Fi drop
                self.error = type(e).__name__
            self.connected = False
            await asyncio.sleep(2)
