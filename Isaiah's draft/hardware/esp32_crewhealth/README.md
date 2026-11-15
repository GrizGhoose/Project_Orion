# ESP32 + MAX30102 sensor node

Feeds live SpO₂ and heart rate to the hardware versions of the apps:
- **`tablet-hardware/`**, the IV-crew tablet. Runs on port 8100.
- **`astronaut-eva-hud-hardware/`**, the helmet HUD. Runs on port 5174.

The original `tablet/` and `astronaut-eva-hud/` keep the recorded NASA/analog replay as the demo backup.

## Parts

- ESP32 dev board (e.g. ESP32-DevKitC / "ESP32 Dev Module").
- MAX30102 pulse-oximeter breakout.
- 4 jumper wires and a USB cable.

## Wiring

| MAX30102 | ESP32 |
|---|---|
| VIN | 3V3 |
| GND | GND |
| SDA | GPIO 21 |
| SCL | GPIO 22 |
| INT | not needed |

## Flash it

1. **Arduino IDE:** install the **esp32** board package by Espressif, then choose the **ESP32 Dev Module** board.
2. **Libraries:** in the Library Manager, install **SparkFun MAX3010x Pulse and Proximity Sensor Library** and **WebSockets** (by Markus Sattler).
3. **Settings:** open `esp32_crewhealth.ino` and set `WIFI_SSID` and `WIFI_PASS`. For a second board, also change `CREW_ID` to `"EV2"` and `HOSTNAME` to `"crewhealth-ev2"`.
4. **Upload,** then open the Serial Monitor at **115200**. You should see:
   ```
   Connected, IP 192.168.x.x
   mDNS: ws://crewhealth-ev1.local:81/
   {"crew":"EV1","seq":0,"t_ms":5123,"spo2":97,"hr":76,"signal":true}
   ```
   One line per second. `"signal":false` means no finger or an unstable reading.

## Connect the apps

The laptop, the iPad or HUD screen, and the ESP32 must be on the **same Wi-Fi**. A phone hotspot works.

```bash
# Tablet (habitat), port 8100. Looks for ws://crewhealth-ev1.local:81/ by default.
cd tablet-hardware && ./run.sh
# If .local names don't resolve, use the IP from the Serial Monitor:
EV1_SENSOR_WS=ws://192.168.x.x:81/ ./run.sh

# Helmet HUD, port 5174
cd astronaut-eva-hud-hardware && npm run dev -- --port 5174
# then open http://localhost:5174/?sensor=ws://192.168.x.x:81/  (the ?sensor part only if .local fails)
```

On the tablet, **SENSORS** (top right) shows each board's status. Use **Restart baseline** once the finger is on the sensor. The detector then records the personal baseline: 240 s, set by `baseline_s` in `tablet-hardware/backend/app/config.py`.

## Message format

One JSON object per second, sent to every connected display:

| Key | Type | Notes |
|---|---|---|
| `crew` | string | `"EV1"` / `"EV2"` |
| `seq` | int | Counts up by 1 per reading, so gaps can be detected |
| `t_ms` | int | Board uptime in ms |
| `spo2` | int or null | % |
| `hr` | int or null | beats/min |
| `signal` | bool | `false` = no finger / bad reading; apps treat it as no signal |
| `rr`, `hrv`, `suit_psia`, `reaction_ms` | optional | Not sent by this sketch. The apps display them if a board adds them. |

Without a board, the tablet also accepts the same JSON as `POST /api/ingest/EV1` (useful for bench tests).

## Limits

- **Not a medical device.** The MAX30102 and the SparkFun/Maxim algorithm give hobby-grade readings that jump with movement, cold fingers or loose contact. Keep the finger still and shield the sensor from bright light.
- **No breathing rate, HRV, suit pressure or O₂ reserve** comes from this sensor. The tablet shows "No sensor" for those, and the HUD keeps its fixed respiration and O₂ reserve values.
- **The hosted Vercel demo can't reach the board.** Browsers block `https` pages from opening `ws://` connections, so use the localhost versions with hardware.
