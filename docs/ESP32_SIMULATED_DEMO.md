# ESP32 → Raspberry Pi simulated telemetry demo

The ESP32 generates HR/SpO₂ once per second and sends schema-3 MQTT packets
through the existing broker, gateway, SQLite database and live HUD. No MAX30102
is required. The Pi displays the received values; it has no independent demo
clock. This is synthetic demonstration data, not a replay of recorded physiology.

Simulation is enabled in `esp32-vitals/esp32_vitals/Simulation.h` by
`SIMULATED_TELEMETRY = true`. Set false and re-upload to restore sensor acquisition.
The existing `secrets.h` supplies Wi-Fi, MQTT credentials and device ID.

## Install

Update the Pi gateway **before** uploading this firmware: older gateways reject
its new per-reading `source` field. Existing packets without the field remain
supported. Each new stored reading identifies `sensor` or `simulated`; old records
are retained. Device ID stays unchanged so the same live HUD address works.

The prepared `exports/orion-pi-simulation-update.tar.gz` contains gateway source
and a prebuilt HUD (no credentials, database or node_modules). Copy it to the Pi,
stop the currently running gateway with Ctrl+C in its terminal, and extract it
from the existing Project_Orion root:

```sh
tar -xzf ~/orion-pi-simulation-update.tar.gz
cd raspberry-pi-gateway
.venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8200
```

The existing `.env`, database and `.venv` are preserved. If the gateway is managed
by a service, restart that existing service instead of starting a second process.

Upload `esp32-vitals/esp32_vitals/esp32_vitals.ino` to ESP32 Dev Module with Arduino
IDE. Existing SparkFun MAX3010x and PubSubClient libraries are still compile-time
dependencies, though simulation never initializes or reads the sensor.

Open `http://localhost:8200` in the Pi's HDMI browser (or
`http://192.168.10.110:8200` from another LAN device). Remove `?demo=1`:
that selects the separate browser simulator and does not display ESP32 packets.
For a non-default device ID use `/?device=YOUR_DEVICE_ID`. Refresh after updating.

## Demo sequence

The sequence repeats every 240 seconds, measured on the ESP32:

| Seconds | Values / phase |
| --- | --- |
| 0–99 | HR 71–73, SpO₂ 98; collects the baseline over at least 90 seconds |
| 100–129 | HR 72, oxygen gradually falls toward 94 |
| 130–149 | HR 80, SpO₂ 94; warning after the existing persistence timer |
| 150–179 | HR 120, SpO₂ 88; critical alert and elevated HR |
| 180–199 | HR and oxygen recover toward 72 / 98 |
| 200–239 | HR 72, SpO₂ 98; alert clears after sustained recovery |

**Start new baseline** sends the existing MQTT command back to the ESP32. It
restarts baseline collection and the demo timeline, and the ESP32 acknowledges
in its next report. Normal loop wrap does not reset the baseline or sequence.

## Verify on the hardware

- Serial Monitor at 115200 shows `SIMULATED phase=...`, HR, SpO₂, sequence and state.
- The HUD says **ESP32 SIMULATED DATA** and shows matching sequence/value pairs in
  its history. Browser polling and Wi-Fi add a small delay; updates are not frame-locked.
- Baseline reaches 15/15 after about 90 seconds; warning, critical and recovery follow.
- Press Start new baseline: acknowledgement appears and normal values resume.
- Unplug ESP32 power: the HUD reports connection lost instead of continuing to simulate.

Software checks cover the full demo cycle, reset, schema validation, persistence
of the source label and HUD rendering. Hardware/network verification remains a
separate deployment check.

## Deployment verified 15 November 2026 (SGT)

Installed on the Pi at `192.168.10.110`, under
`/home/ryantrc/Project_Orion`, and flashed the connected ESP32 on
`/dev/cu.wchusbserial210`. Verified fresh simulated MQTT readings through the API,
persisted simulation labels, and a baseline restart acknowledged by the ESP32.
The HDMI desktop screenshot confirmed the live HUD displayed 73 BPM / 98% and
ESP32 SIMULATED DATA. The complete warning/critical/recovery cycle is covered by
the native firmware test; it was not observed end-to-end on hardware during deployment.

Pi application backup: `~/orion-before-simulation-20261115.tar.gz`.
The gateway is currently running with nohup; log: `/tmp/orion-simulation-gateway.log`.
No new boot-time service was installed.
