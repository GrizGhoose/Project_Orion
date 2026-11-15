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

The sensor runs continuously at 100 samples/s with averaging of 4, producing 25 red/IR sample pairs per second. Every six seconds the ESP32 feeds the most recent 100 pairs (four seconds) into the project-local corrected Maxim algorithm (`PpgAlgorithm.cpp`). SparkFun still supplies the sensor driver. The `MAX30105` class name is expected; that library also supports MAX30102.

The sensor does **not** sleep five seconds between reports. A one-second optical recording is too short for this implementation's four-second algorithm window. Publishing every six seconds still gives 15 reports per 90 seconds of operation. The timestamps of the first and last entries in a full window are 84 seconds apart.

Measurements are accepted separately. An interrupted/incomplete acquisition is not a physiological measurement. Once a complete window exists, IR pulse quality gates HR; both optical channels and their pulse ratios gate SpO₂. Rejected values are `null` in MQTT and `NA` in the serial summary, never zero. `hr_valid` and `spo2_valid` are authoritative per metric; `valid` means **both** passed. Algorithm candidate values and flags are diagnostics only.

`PpgAnalysis.h` applies these explicit **prototype heuristics**, not calibrated medical quality criteria:

- Per channel: retain mean >10,000, peak <260,000, and span >50 counts; require detrended RMS/DC ≥0.0005.
- Reject span/DC >0.20, absolute fitted drift/DC >0.10 over the window, adjacent step/DC >0.05, or detrended RMS/DC >0.05.
- Require at least three IR valleys (two pulse intervals), with interval coefficient of variation ≤0.20. A four-second window may reject slow pulses because too few cycles fit; extending the algorithm window requires redesign, not merely changing its input length.
- SpO₂ additionally requires red/IR detrended correlation ≥0.80, at least two positive per-beat ratios, and ratio coefficient of variation ≤0.15.
- Accepted output ranges remain HR 35–220 BPM and SpO₂ 70–100%. Low SpO₂ is **not** rejected merely for being below the startup-baseline eligibility threshold.

These checks reject obvious drift/contact changes but can still accept periodic artifacts. The 10,000-count cutoff is inherited from the prototype, not a datasheet-defined detection threshold. Finger and earlobe placement each need actual waveform/reference validation; do not tune gates simply to produce normal numbers. The startup baseline is a personal reference, not optical SpO₂ calibration.

State and reason fields distinguish:

| Situation | `state` | Detail |
| --- | --- | --- |
| Initial/restarted window or a discarded timing gap | `WARMING_UP` | `acquisition=warming_up` or `sampling_gap` |
| Missing sensor, failed transfer/configuration, stopped samples | `ACQUISITION_ERROR` | Specific `acquisition` reason; both qualities `not_evaluated` |
| Complete acquisition, neither estimate accepted | `MEASUREMENT_REJECTED` | `acquisition=ok`; separate HR/SpO₂ rejection reasons |
| Only one accepted estimate, no active accepted oxygen alert | `PARTIAL_SIGNAL` | Accepted metric remains visible |
| Accepted SpO₂ with active warning/critical decision | `WARNING` / `CRITICAL` | Does not require accepted HR |
| Both accepted, no oxygen alert | `CALIBRATING` / `NORMAL` | Based on baseline progress |

The aggregate quality labels are `accepted`, `partial`, `rejected`, and `not_evaluated`. “Accepted” means only that the listed checks passed.

A separate ESP32 task handles Wi-Fi/MQTT so connection retries do not pause sampling. The sensor uses the same startup delay, LED setting (0x1F), 100 kHz I²C clock and configuration as the original raw test. The I²C peripheral is opened once rather than repeatedly restarted.

`CheckedFifo.h` replaces the library's unchecked FIFO data reads. It checks transfer lengths, uses the ADC's low 18 bits, and drains queued pairs directly rather than passing them through the library's four-entry buffer. Polls run every 10 ms; a polling gap over 200 ms or a backlog over eight pairs discards the interrupted window. A failed transfer or two seconds without samples starts a five-second initialization retry. Sensor configuration is read back before acquisition starts. No optical or algorithm validity thresholds are relaxed.

Serial diagnostics distinguish initialization failures, transfer failures, sampling gaps and rejected optical measurements. Diagnostic transfer code 6 means a short/failed read in this sketch; it is not a standard Wire error code. A power cycle resets both boards; RST/EN resets only the ESP32. Initialization retries cannot repair a power, voltage-level or physical connection fault.


## Baseline and prototype alert rules

On boot, calibration starts automatically. The first **15 valid baseline-eligible reports** establish arithmetic means for HR and SpO₂. Eligibility is HR 40–120 and SpO₂ ≥95. Low readings are not learned as a healthy baseline; partial/rejected/ineligible readings extend calibration beyond 90 seconds. Stay at rest during this period. Baseline means freeze after collection, rather than following a deterioration downward.

Rules are explicitly coded in `esp32_vitals/Monitor.h`. These are **hackathon demonstration rules, not medically validated distress detection**. They replace the simulator's synthetic baseline assumptions in live mode:

| Reported condition | Firmware behavior |
| --- | --- |
| SpO₂ at least 3 percentage points below established baseline, or below 94 | WARNING after 3 consecutive valid low reports |
| SpO₂ at least 6 percentage points below established baseline, or below 90 | CRITICAL after 2 consecutive valid severe reports |
| Valid SpO₂ below 85 | Immediate CRITICAL, including during calibration |
| HR at least 20 BPM above established baseline | `hr_elevated=true`; displayed as an advisory and alongside an oxygen alert |
| SpO₂ ≥95 and less than 2 points below baseline | Clear oxygen alert after 3 consecutive recovery reports |
| Rejected/unavailable SpO₂ | Reset oxygen counters; preserve the previous oxygen alert separately; accepted HR may still be displayed |

Heart-rate elevation alone does not label hypoxia. During calibration the absolute oxygen conditions still apply. Thresholds operate on consecutive **reports**, not continuously observed seconds; gaps in valid reports interrupt escalation/recovery. The last 15 reports provide the rolling history; the alert rules use consecutive recent reports within that history. The four-second optical windows leave two seconds between evaluated windows, so short events may be missed.

A power cycle creates a new boot ID and baseline. **Start new baseline** on the HUD sends `restart:<command-id>` to the ESP32. The ESP32 resets calibration and its rolling window, increments `calibration_id`, and acknowledges in its next six-second packet. Previously persisted Pi history is retained. Repeated delivery of the same command is ignored. The HUD must receive the acknowledgement before reporting completion.

## Transport

Publish topic: `eva/<DEVICE_ID>/telemetry`, non-retained. Command topic: `eva/<DEVICE_ID>/command`. Telemetry includes:

- Schema version **2**, device/boot/calibration identifiers and last acknowledged command.
- Frozen baseline means (or null while calibrating) and calibration progress.
- Up to 15 readings containing sequence, device uptime, HR, SpO₂, per-metric validity/quality, acquisition status, state, oxygen alert and HR elevation flag.
- Device send uptime, used to avoid presenting queued samples as fresh.

MQTT publication is QoS 0; repeated history recovers dropped reports while they remain in the 15-entry window. Disconnects longer than 90 seconds can lose older reports. ESP32 history is RAM-only; the Pi database persists across restarts. There is no flash spool or guaranteed offline archive in this prototype.

## Capture and inspect the actual waveform

Upload this sketch, then open Serial Monitor at **115200 baud**. The boot banner is `EVA firmware: ppg-quality-v2`. Every six seconds, diagnostics show channel DC means, detrended RMS, fractional span/drift/steps, candidate results, channel correlation, interval CV, and the mean/CV of per-beat R.

Send **`w`** (newline optional) to request the next complete 100-pair window. It waits for a complete window if acquisition is warming up. A separate task prints the snapshot so the 100-line dump does not block optical sampling. The output includes:

```text
PPG_BEGIN,seq=...,end_ms=...,rate_hz=25,count=100
PPG_COLUMNS,seq,index,red,ir
PPG,...
BEAT_COLUMNS,seq,index,red_ac,red_dc,ir_ac,ir_dc,R
BEAT,...
PPG_END,seq=...
```

Save the serial text, including the BEGIN/END markers, then run from the repository root:

```sh
python3 esp32-vitals/tools/inspect_ppg.py /path/to/serial-log.txt --output /tmp/ppg-capture
```

Open the generated `.svg` to view raw red/IR counts and mean-normalized variations. Each capture also has a sample CSV and a `.beats.csv`. Arduino timestamps and unrelated log lines are supported; missing/duplicate samples or incomplete captures cause an error. The plot retains drift; its normalized panel is **not** isolated pulsatile AC/DC. Sample spacing is nominal 40 ms; `end_ms` is report uptime, not a synchronized wall-clock timestamp. Logs containing only min/max/mean cannot reconstruct a waveform.

Per-beat AC comes from each channel's peak minus a line between adjacent IR valleys; the algorithm's DC denominator is that channel's peak. These differ from the whole-window mean and RMS diagnostics. R is `(red_AC/red_DC)/(IR_AC/IR_DC)`. Inspect both repeating pulse morphology and consistency of the ratios. These are candidate beat diagnostics even when the window is rejected. No real earlobe waveform has been validated by the synthetic regression tests.

## Local conversion algorithm

`PpgAlgorithm.cpp/.h` vendor the installed SparkFun MAX3010x library **1.1.2** Maxim algorithm with its original license. The firmware calls the `orion` namespace, not the global installed `spo2_algorithm.h`. The installed library is unchanged.

Changes: 64-bit intermediate cross-products and scaling; IR AC at the IR peak index; correct odd/even ratio median; positive AC/ratio checks; exact input-length/18-bit-range validation; valley-index bounds and an end-of-array flat-peak guard; optional beat/valley diagnostics. The lookup table is unchanged and has not been calibrated to this breakout/mounting arrangement. Algorithm working buffers are static and must be used only from the acquisition task.

Deploy the updated Pi gateway and rebuild the HUD **before uploading schema-2 firmware**. The updated gateway/HUD still accept schema-1 devices and stored history; older gateway versions reject schema-2 packets. The separate tablet application is still on its older integration.

## Checks

Native firmware decision tests:

```sh
c++ -std=c++11 tests/monitor_test.cpp -o /tmp/eva-monitor-test
/tmp/eva-monitor-test
c++ -std=c++11 tests/fifo_test.cpp -o /tmp/eva-fifo-test
/tmp/eva-fifo-test
c++ -std=c++11 -fsanitize=undefined,bounds -fno-sanitize-recover=all tests/ppg_test.cpp esp32_vitals/PpgAlgorithm.cpp -o /tmp/eva-ppg-test
/tmp/eva-ppg-test
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

The sketch has been compiled for `esp32:esp32:esp32` with Espressif core 3.3.12. Compilation and software tests do not substitute for testing this firmware on the connected sensor.
