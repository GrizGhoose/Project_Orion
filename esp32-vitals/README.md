# ESP32 MAX30102 measurements, baseline and MQTT history

This is the firmware for the live astronaut HUD. The ESP32 computes heart rate (BPM), estimated SpO₂ (%), signal validity, startup baseline, and alert state. The Raspberry Pi stores and displays those results; it does not recompute them.

## Upload

1. Keep the verified wiring: MAX30102 breakout VIN → ESP32 3V3, GND → GND, SDA → GPIO21, SCL → GPIO22. Leave INT, IRD and RD disconnected. This wiring refers to the tested breakout board, not a bare sensor IC.
2. In Arduino IDE install **esp32 by Espressif Systems**, **SparkFun MAX3010x Pulse and Proximity Sensor Library**, and **PubSubClient by Nick O'Leary**.
3. Open `esp32_vitals/esp32_vitals.ino`. Copy `secrets.example.h` to `secrets.h` alongside it. Fill in Wi-Fi credentials, the Pi's LAN address, and the existing Mosquitto username/password. The ESP32 and Pi must be on a mutually reachable network. Use a unique `DEVICE_ID` for each astronaut (default `astro01`).
4. Select **ESP32 Dev Module** and the connected USB serial port. Upload; open Serial Monitor at **115200 baud**.
5. Start the Pi gateway as described in `../raspberry-pi-gateway/README.md`. Rest your finger on the optical window without pressing hard. The sensor samples immediately; allow at least 90 seconds of valid resting readings for baseline collection.

`secrets.h` is ignored by Git. The example contains placeholders only. This sketch replaces the simple raw-sensor/hello-MQTT tests on the device, but those source folders remain available.

## Acquisition and quality

The sensor runs continuously at 100 samples/s with averaging of 4, producing 25 red/IR sample pairs per second. Every six seconds the ESP32 feeds the most recent 100 pairs (four seconds) into the Maxim algorithm included with the SparkFun library. The `MAX30105` class name is expected; that library also supports MAX30102.

The sensor does **not** sleep five seconds between reports. A one-second optical recording is too short for this implementation's four-second algorithm window. Publishing every six seconds still gives 15 reports per 90 seconds of operation. The timestamps of the first and last entries in a full window are 84 seconds apart.

A report is invalid if the window is incomplete or interrupted, either optical channel is too weak/clipped/flat, the algorithm rejects HR/SpO₂, or output is outside the configured acceptance range (HR 35–220, SpO₂ 70–100). Invalid reports carry `null` measurements and `NO_SIGNAL`, remain in history, and never count toward the baseline. Signal checks are basic heuristics and cannot eliminate motion artifacts or establish medical accuracy. Initially test on a stationary fingertip; ear placement needs separate mechanical and measurement validation.

A separate ESP32 task handles Wi-Fi/MQTT so connection retries do not pause sampling. A gap over 250 ms discards the optical window. If the sensor is absent at boot, fix the connection and reset the ESP32.

## Baseline and prototype alert rules

On boot, calibration starts automatically. The first **15 valid baseline-eligible reports** establish arithmetic means for HR and SpO₂. Eligibility is HR 40–120 and SpO₂ ≥95. Low readings are not learned as a healthy baseline; invalid/ineligible readings extend calibration beyond 90 seconds. Stay at rest during this period. Baseline means freeze after collection, rather than following a deterioration downward.

Rules are explicitly coded in `esp32_vitals/Monitor.h`. These are **hackathon demonstration rules, not medically validated distress detection**. They replace the simulator's synthetic baseline assumptions in live mode:

| Reported condition | Firmware behavior |
| --- | --- |
| SpO₂ at least 3 percentage points below established baseline, or below 94 | WARNING after 3 consecutive valid low reports |
| SpO₂ at least 6 percentage points below established baseline, or below 90 | CRITICAL after 2 consecutive valid severe reports |
| Valid SpO₂ below 85 | Immediate CRITICAL, including during calibration |
| HR at least 20 BPM above established baseline | `hr_elevated=true`; displayed as an advisory and alongside an oxygen alert |
| SpO₂ ≥95 and less than 2 points below baseline | Clear oxygen alert after 3 consecutive recovery reports |
| Invalid reading | NO_SIGNAL; reset consecutive counters, preserve the last oxygen alert separately |

Heart-rate elevation alone does not label hypoxia. During calibration the absolute oxygen conditions still apply. Thresholds operate on consecutive **reports**, not continuously observed seconds; gaps in valid reports interrupt escalation/recovery. The last 15 reports provide the rolling history; the alert rules use consecutive recent reports within that history. The four-second optical windows leave two seconds between evaluated windows, so short events may be missed.

A power cycle creates a new boot ID and baseline. **Start new baseline** on the HUD sends `restart:<command-id>` to the ESP32. The ESP32 resets calibration and its rolling window, increments `calibration_id`, and acknowledges in its next six-second packet. Previously persisted Pi history is retained. Repeated delivery of the same command is ignored. The HUD must receive the acknowledgement before reporting completion.

## Transport

Publish topic: `eva/<DEVICE_ID>/telemetry`, non-retained. Command topic: `eva/<DEVICE_ID>/command`. Telemetry includes:

- Schema version, device/boot/calibration identifiers and last acknowledged command.
- Frozen baseline means (or null while calibrating) and calibration progress.
- Up to 15 readings containing sequence, device uptime, HR, SpO₂, validity, signal reason, state, oxygen alert and HR elevation flag.
- Device send uptime, used to avoid presenting queued samples as fresh.

MQTT publication is QoS 0; repeated history recovers dropped reports while they remain in the 15-entry window. Disconnects longer than 90 seconds can lose older reports. ESP32 history is RAM-only; the Pi database persists across restarts. There is no flash spool or guaranteed offline archive in this prototype.

## Checks

Native firmware decision tests:

```sh
c++ -std=c++11 tests/monitor_test.cpp -o /tmp/eva-monitor-test
/tmp/eva-monitor-test
```

The sketch has been compiled for `esp32:esp32:esp32` with Espressif core 3.3.8. Compilation and software tests do not substitute for testing this firmware on the connected sensor.
