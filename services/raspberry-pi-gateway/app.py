"""MQTT ingestion and shared HUD/tablet API. Run on the Raspberry Pi."""
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import paho.mqtt.client as mqtt
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import ValidationError

from models import Packet
from storage import Store

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / '.env')
DB = Path(os.environ.get('EVA_DB', str(ROOT / 'data' / 'eva.sqlite3')))
DB.parent.mkdir(parents=True, exist_ok=True)
store = Store(str(DB))
broker_connected = False
log = logging.getLogger('eva')
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='eva-pi-' + uuid.uuid4().hex[:8])
client.username_pw_set(os.environ.get('MQTT_USER', 'eva'), os.environ.get('MQTT_PASSWORD', ''))
client.reconnect_delay_set(1, 30)


def on_connect(c, userdata, flags, reason, properties):
    global broker_connected
    broker_connected = not reason.is_failure
    if broker_connected:
        c.subscribe('eva/+/telemetry', qos=1)
    else:
        log.error('MQTT broker refused connection: %s', reason)


def on_disconnect(c, userdata, flags, reason, properties):
    global broker_connected
    broker_connected = False


def on_message(c, userdata, message):
    if message.retain or len(message.payload) > 65536:
        return  # Old retained packets are never evidence of a live sensor.
    try:
        packet = Packet.model_validate_json(message.payload).model_dump(by_alias=True)
        if message.topic != f"eva/{packet['device_id']}/telemetry":
            raise ValueError('Device/topic mismatch')
        store.ingest(packet)
    except (ValidationError, ValueError, UnicodeError, json.JSONDecodeError) as error:
        log.warning('Rejected telemetry: %s', type(error).__name__)
    except Exception:
        log.exception('Unable to persist telemetry')


client.on_connect, client.on_disconnect, client.on_message = on_connect, on_disconnect, on_message


@asynccontextmanager
async def lifespan(app):
    client.connect_async(os.environ.get('MQTT_HOST', 'localhost'), int(os.environ.get('MQTT_PORT', '1883')))
    client.loop_start()
    yield
    client.disconnect()
    client.loop_stop()


app = FastAPI(title='EVA telemetry gateway', lifespan=lifespan)


@app.get('/api/devices/{device}')
def snapshot(device: str):
    return {**store.snapshot(device), 'broker_connected': broker_connected}


@app.get('/api/devices/{device}/readings')
def readings(device: str, limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0)):
    return {'readings': store.readings(device, limit, offset)}


@app.get('/api/devices/{device}/calibrations')
def calibrations(device: str):
    return {'calibrations': store.calibrations(device)}


@app.post('/api/devices/{device}/baseline/restart', status_code=202)
def restart(device: str):
    if not broker_connected or not store.snapshot(device)['fresh']:
        raise HTTPException(409, 'A live ESP32 connection is required')
    command_id = str(uuid.uuid4())
    info = client.publish(f'eva/{device}/command', f'restart:{command_id}', qos=1, retain=False)
    if info.rc != mqtt.MQTT_ERR_SUCCESS:
        raise HTTPException(503, 'MQTT command could not be queued')
    return {'command_id': command_id, 'status': 'pending_device_ack'}


DIST = Path(os.environ.get('HUD_DIST', str(ROOT.parent.parent / 'apps' / 'astronaut-eva-hud-hardware' / 'dist')))
if DIST.is_dir():
    app.mount('/', StaticFiles(directory=DIST, html=True), name='hud')
