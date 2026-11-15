# 60-second at-rest red/IR recording

This separate sketch replaces the running ESP32 program during this test. It does not use Wi-Fi/MQTT, estimate HR/SpO2, classify health, filter the waveform or reject low optical counts. The original raw-reading sketch and live firmware source remain available.

Configuration matches the original raw test: GPIO21/22 I2C, 100 kHz, LED code 31, red+IR mode, averaging 4, sensor sample rate 100 Hz, 411 microsecond pulse width and 4096 nA ADC range. FIFO output is approximately 25 red/IR pairs/s. Configuration readback and checked FIFO transfers detect acquisition failures. `CheckedFifo.h` is a standalone copy of the tested helper from `firmware/esp32-vitals/esp32_vitals/CheckedFifo.h` so Arduino IDE can build this sketch folder directly.

Upload `capture_60s.ino` with ESP32 Dev Module selected. Close Arduino Serial Monitor/Plotter before running the Mac recorder:

```sh
cd /Users/ryantan/Project_Orion
python3 research/MAX30102_raw_reading-test/tools/record_raw.py --port /dev/cu.wchusbserial210 --site earlobe
```

Change `--site` to `fingertip` for that placement. Only start the command when ready to remain at rest for the whole recording. After the device confirms readiness, the recorder gives a five-second countdown, starts the acquisition and saves 60 seconds. Approximately 1,500 pairs are expected; the exact number depends on clock tolerance and acquisition boundaries. Do not open another serial application during recording.

Saved under `research/MAX30102_raw_reading-test/recordings/at_rest_<site>_<timestamp>_SGT/`:

- `readings.txt`: only `Red:<count>\tIR:<count>` sample lines, matching the original raw test format.
- `readings.csv`: only `red,ir` columns, with every captured pair.
- `timing.csv`: row index, device elapsed FIFO-read time and host receive time; separate from the optical-only logs.
- `metadata.json`: placement, at-rest label, acquisition settings, sample count, capture completion/error, and timing warnings. Health status is explicitly unverified; no oxygen reference is assumed.
- `serial.log`: exact received bytes, including control/error markers, for auditing.

Recordings are git-ignored. No samples are discarded for physiological quality. Failed transfers, excessive acquisition gaps, missing serial rows, resets and incomplete recordings are not labelled successful. Partial logs are retained. A device-complete capture may still have timing warnings; inspect the metadata before treating it as continuous data.

Device elapsed times describe FIFO reads, not exact optical conversion timestamps. Multiple pairs in a FIFO batch can share a read timestamp; nominal pair spacing is 40 ms. The recording duration is measured on the ESP32, not by host arrival timestamps.

Firmware commands are `p` (status), `r` (start one 60-second recording) and `x` (abort). The recorder sends these automatically. The program waits after each completed capture; no test starts on boot. The existing Pi HUD will lose its live feed while this raw-only firmware is installed. Re-upload `firmware/esp32-vitals/esp32_vitals/esp32_vitals.ino` to restore live monitoring.

Tests (no sensor required):

```sh
python3 -m unittest discover -s research/MAX30102_raw_reading-test/tests -v
```
