# Raspberry Pi telemetry database and live HUD

```text
MAX30102 → ESP32 (optical processing, baseline, alert decisions)
                   ↓ MQTT, result + rolling 90-second result history every second
           Mosquitto on Raspberry Pi
                   ↓
           Python gateway → SQLite database → HTTP API → astronaut HUD browser
                                                      → tablet UI integration
```

The gateway stores ESP32 decisions unchanged. It computes connection freshness and timestamps only. The astronaut HUD now uses this service by default. The separate `tablet-hardware` frontend is **not rewired by this change**; it can use the same API described below in the next integration step.

## Start on the Raspberry Pi

Keep your working Mosquitto setup from `../docs/ESP32_RASPBERRY_PI_MQTT.md`. Its listener must accept the ESP32 on port 1883, with the credentials configured in the firmware. The gateway defaults to connecting to the broker on `localhost`.

From the repository root on the Pi, build the HUD using a compatible Node.js installation (Node 24.15+ is supported by the current lockfile):

```sh
cd astronaut-eva-hud-hardware
npm ci
npm run build
cd ../raspberry-pi-gateway
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` to set your existing MQTT password. Quote passwords containing spaces or `#`. Then start the gateway from this folder:

```sh
.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8200
```

Keep the terminal running. Open **http://localhost:8200** in the Pi's browser. From another device on the same LAN, open `http://PI_LAN_ADDRESS:8200`. For a second astronaut use `/?device=astro02`, matching that ESP32's unique `DEVICE_ID`.

The gateway serves the built HUD and API from one origin, so the browser needs no MQTT credentials or direct ESP32 connection. These URLs also work from a physical tablet browser to view the HUD. The dedicated tablet UI needs an adapter to this API; its current backend is separate.

Use this only on the trusted demo LAN. HTTP has no login and reachable clients can request baseline restarts. MQTT credentials are private to `.env` / ESP32 `secrets.h`; never put them into browser code or commit them. Do not expose these demo ports to the internet.

## What to expect

1. Upload `../esp32-vitals/esp32_vitals/esp32_vitals.ino` using your own `secrets.h`.
2. Serial Monitor should show `MQTT connected`, then a report every second.
3. The HUD shows independently accepted HR/SpO₂ or an explicit acquisition/rejection state, and calibration progress such as `4/15`.
4. After 15 eligible samples taken at least six seconds apart (at least 90 seconds), the HUD shows frozen baseline means. The table below the visor shows up to 90 results from the trailing 90 seconds.
5. **Start new baseline** asks the ESP32 to restart. It stays pending until the command ID returns from the ESP32; a timeout does not claim success.
6. Disconnect the ESP32 to test connection handling: after 3 seconds without a fresh sample for schema 3 (18 seconds for legacy schemas), plus the browser polling delay, current readings disappear and the HUD shows `CONNECTION LOST`. Stored historical readings remain.

Respiration, suit oxygen reserve and simulated ECG/breathing waveforms are not fabricated in live mode. The visible elapsed counter follows ESP32 uptime (it resets on power cycle), not a certified mission clock. `?demo=1` explicitly enables the old simulator; never use that URL to verify sensor data.

## Database and API

SQLite defaults to `data/eva.sqlite3` (ignored by Git). It survives gateway and Pi restarts. Do not delete this file if you need the saved measurements. Back it up with SQLite's backup tools while the service is running; simply copying only the main file can omit WAL transactions. There is currently no automatic retention/deletion policy.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/devices/astro01` | Latest ESP32 packet, fresh flag, sample age, gateway receive time, broker connection |
| `GET /api/devices/astro01/readings?limit=100&offset=0` | Persisted readings, newest first; maximum page 1000 |
| `GET /api/devices/astro01/calibrations` | Last 100 saved calibration sessions, including prior baseline means |
| `POST /api/devices/astro01/baseline/restart` | Queue ESP32 restart; returns command ID and HTTP 202, **not** a completed calibration |
| `GET /docs` | Interactive API schema |

The gateway accepts schemas **1, 2 and 3**, and keeps stored legacy packets unchanged. Deploy this version and rebuild the HUD before uploading schema-3 firmware. Each packet's `history[-1]` is its latest measurement.

For schemas 2 and 3, display `hr` only when `hr_valid`, and `spo2` only when `spo2_valid`; `valid` means **both** accepted. Never hide an accepted HR solely because SpO₂ was rejected. Use `acquisition`, `hr_quality`, and `spo2_quality` for diagnostics. `ACQUISITION_ERROR` is distinct from `MEASUREMENT_REJECTED`; `PARTIAL_SIGNAL` retains a single accepted value. An active oxygen alert may coexist with rejected HR. Present `alert` as current only when SpO₂ is accepted and the packet is fresh; otherwise label it as the prior alert. Firmware quality checks are heuristics, not accuracy certification.

Schema-1 readings keep the legacy combined `valid` flag and `NO_SIGNAL`. All versions use the ESP32's baseline/state/alert decisions unchanged. Hide all current values if `fresh` or `broker_connected` is false. Null is never zero or a normal measurement. The maximum MQTT body is 65,536 bytes; raw waveform captures are serial-only and are not stored in the Pi database.

Schema 3 retains the schema-2 reading fields, but allows up to 90 reports in a window shorter than 90,000 ms and uses a one-second cadence. Legacy schemas remain limited to 15 reports. The rolling display expires results; the Pi database still preserves older readings and has no automatic deletion policy.

Rows are de-duplicated by `(device_id, boot_id, seq)`. Overlapping windows are inserted once; duplicate/out-of-order packets cannot refresh the live state. Packets from a known retired boot cannot overwrite the current boot. A previously unseen boot is treated as a restart, since the ESP32 has no synchronized wall clock. Retained MQTT packets are ignored. The gateway validates message shape, sizes, measurement ranges and topic identity, without calculating physiological values or alarm thresholds.

`received` is the Pi receipt timestamp. `sample_time_estimate` subtracts the ESP32-reported age from that receipt time. It is approximate (network transit is not measured); device `t_ms` is authoritative for within-boot ordering. Schema-3 ESP32 RAM holds up to 90 reports from the last 90 seconds, so an extended network outage can leave permanent archive gaps. One gateway process/worker should write this database and consume MQTT.

Optional environment variables: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `EVA_DB`, `HUD_DIST`. `.env` loads automatically without overriding existing environment variables. Changing the database or built-UI path requires restart.

## Development and testing

Run the Python service on port 8200. In `astronaut-eva-hud-hardware`, `npm run dev` proxies `/api` to `127.0.0.1:8200`.

```sh
# Inside raspberry-pi-gateway
.venv/bin/pip install httpx
.venv/bin/python -m unittest discover -s tests -v
# Inside astronaut-eva-hud-hardware
npm test
npm run lint
npm run build
```

Tests cover packet validation, persistence, duplicate history, stale packets, reboots, command acknowledgement, and rendering fresh/stale/failed data. They do not establish optical accuracy or medically validate the prototype thresholds. Firmware rules and signal limitations are documented in `../esp32-vitals/README.md`.
